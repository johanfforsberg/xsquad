from collections import defaultdict
import json
from pprint import pprint
from random import random
from math import sqrt
import time

from flask import (redirect, url_for, request, jsonify,
                   send_from_directory, Response,
                   render_template, flash, session, abort)
from gevent.queue import Queue

from . import app
# from .forms import LoginForm

from .xsquad.level import Level
from .xsquad.game import Game, NotEnoughMovement, NotVisible
from .xsquad.team import BadPath
from .xsquad.load import load_level

# from models import games
games = {}

subscriptions = defaultdict(dict)


def broadcast(gameid, player, message):
    "Send a message to the given player if subscribed"
    if gameid in subscriptions:
        msg = json.dumps(message)
        for p, queue in subscriptions[gameid].items():
            if p == player:
                queue.put(msg)


@app.route('/games', methods=["get"])
def get_game_list():
    return render_template('game_list.html', games=games,
                           username=session.get("username"))


@app.route('/games/<gameid>/state', methods=['GET'])
def get_state(gameid):

    """
    Return the current game state from the perspective of the player, as JSON.
    Note that this does not include the field of view.

    Fields:
    - id: unique game id (int)
    - level: currently known level (object, see below)
    - players: participating player names (array)
    - my_turn: whether it's the player's turn or not (bool)
    - team: the player's team (object, see below)
    - enemies: list of enemies currently seen
      # TODO: should not reveal all data about the enemies!

    Level:
    - size: [xsize, ysize, zsize] of the level
    - walls: the obstacles in the world, restricting movement (object)
    - items: (not implemented yet)
    - walltypes: stores the different kinds of walls
    - graph: precalculated graph for movement

    Team:
    - player: name of the player owning the team
    - members: array of persons on the team (object, see below)

    Member:
    - name: arbitrary string to identify the member
    - position: [x, y, z] position in the current level
    - rotation: which direction the member is facing (int)
    - speed: how many actions the member may take per turn
    - moves: number of actions left this turn
    - maxhealth: maximum amount of health
    - health: amount of health left
    - vision: how far the member can see

    """

    print "gameid", gameid
    game = games[int(gameid)]
    pprint(game)
    player = session["username"]
    team = game.teams[game.players.index(player)]
    data = game.dbdict(player)
    # enemies = [game.inactive_team.people[i].position
    #            for i in team.enemies_seen()]
    enemies = {i: game.inactive_team.people[i].dbdict(True)
               for i in team.enemies_seen()}
    data["enemies"] = enemies
    return jsonify(data)


@app.route('/games/new', methods=['GET'])
def new_game():
    gameid = (max(map(int, games.keys())) + 1) if games else 0
    player = session["username"]
    if not player:
        return redirect(url_for('login'))
    level, walltypes = load_level("data/level.txt")
    level = Level((10, 14, 4), level, walltypes)
    game = Game(_id=gameid, level=level)
    game.join(player)
    games[gameid] = game
    return redirect("/games/%d" % gameid)


@app.route('/games/<int:gameid>/fov', methods=['GET'])
def get_fov(gameid):
    """
    Returns the Field of Vision for the player's team. This means
    all the walls, items and enemies currently visible by any member.
    """
    game = games[int(gameid)]
    player = session["username"]
    team = game.get_team(player)
    other_team = game.get_opponent(player)
    person = int(request.args.get("person", 0))
    t0 = time.time()
    fov, enemies = game.get_team_fov(team)
    print("team FOV took %.3f" % (time.time() - t0))
    disappeared = team.spotted[person] - set(enemies)
    if enemies or disappeared:
        for e in enemies:
            other_team.spotted[e].add(person)
        for e in disappeared:
            other_team.spotted[e].remove(person)
        team.spotted[person] = set(enemies)
    return jsonify({"fov": fov, "enemies": [e.dbdict(True) for e in enemies]})


@app.route('/games/<int:gameid>/done', methods=["POST"])
def end_turn(gameid):
    game = games[gameid]
    team = game.active_team
    if game.active_player != session["username"]:
        abort(403)
    if game.over:
        abort(403)
    print "turn end"
    success = game.end_turn(session["username"])
    if success:
        team.reset()
        broadcast(gameid, game.active_player, {"type": "opponent_done"})
        return jsonify(dict(my_turn=False))
    abort(403)


@app.route('/games/<int:gameid>/shoot', methods=["POST"])
def post_shot(gameid):
    game = games[int(gameid)]
    if game.active_player != session["username"]:
        abort(403)
    if game.over:
        abort(403)

    team = game.active_team
    attacker = team.members[request.json["attacker"]]
    opponent_team = game.inactive_team
    target = opponent_team.members[request.json["target"]]

    try:
        hit = game.attack(team, attacker, opponent_team, target)
    except (NotEnoughMovement, NotVisible):
        abort(403)  # TODO: return something more helpful instead

    broadcast(gameid, game.inactive_player,
              {"type": "opponent_fired",
               "data": {
                   "attacker": attacker.dbdict(True),
                   "target": target.dbdict(),
                   "success": hit
               }})

    if opponent_team.eliminated:
        broadcast(gameid, game.active_player, {"type": "game_won"})
        broadcast(gameid, game.inactive_player, {"type": "game_lost"})

    return jsonify(success=hit, kill=target.dead,
                   attacker=attacker.dbdict(), target=target.dbdict(True))


@app.route('/games/<int:gameid>/movepath', methods=["POST"])
def post_movepath(gameid):
    """Move a given team member along a path.
    Makes sure that the path is valid, then calculates the FOV changes
    for each step, and checks if the visibility of enemies changes.
    If not explicitly turned off, the walk will be terminated if
    an enemy comes into view at any time.
    """
    game = games[int(gameid)]
    if game.active_player != session["username"]:
        abort(403)
    if game.over:
        abort(403)
    team = game.active_team

    membername = request.json.get("person", 0)
    path = request.json["path"]
    rotation = request.json["rotation"]
    stop_for_enemy = not request.json.get("dont_stop")

    # let's try to perform the movement
    try:
        result = game.movement(team, membername, path, rotation, stop_for_enemy)
    except (NotEnoughMovement, BadPath):
        abort(403)  # TODO: be more helpful here

    if result.seen_paths:  # update opponent about movements in vicinity
        member = team.members[membername]
        broadcast(gameid, game.inactive_player,
                  {"type": "opponent_visible",
                   "data": {"enemy": member.dbdict(True),
                            "paths": result.seen_paths,  # the movement seen
                            "seen_at_end": result.seen_at_end}})

    # return the actual path - which is always a subset of the one asked
    # for (may change) - the FOV updates and any enemies that were spotted
    return jsonify(dict(path=result.path, team=team.dbdict(),
                        fov_diffs=result.fov_diffs,
                        enemy_diffs=result.enemy_diffs,
                        enemies=[e.dbdict(True) for e in result.enemies]))


def make_sse(data):
    return "data: %s\n\n" % data


@app.route("/games/<int:gameid>/subscribe")
def subscribe(gameid):

    """
    Clients can subscribe to "push" updates via SSE. This is used
    mainly for notifying the inactive player e.g. when an opposing
    team member appears in view or when the other player's turn ends.
    """

    if gameid not in games:
        abort(404)

    game = games[gameid]
    player = session["username"]

    if player not in game.players:
        abort(403)

    def messages():
        "Keep asynchronously waiting for messages on the queue"
        q = Queue()
        subscriptions[gameid][player] = q
        try:
            while True:
                result = q.get()
                ev = make_sse(result)
                yield ev
        except GeneratorExit:
            subscriptions.remove(q)

    return Response(messages(), mimetype="text/event-stream")


@app.route('/games/<int:gameid>')
def get_game(gameid):
    game = games.get(gameid)
    player = session.get("username")
    if not player:
        return redirect(url_for('login'))
    if game:
        if game.waiting and player not in game.players:
            game.join(player)
            broadcast(gameid, game.active_player, {
                "type": "opponent_joined",
                "data": {"players": game.players, "my_turn": True}})
        return render_template('game.html', gameid=gameid,
                               team=game.players.index(player),
                               username=session["username"])
    else:
        return redirect(url_for('new_game'))


# warning: extremely primitive login handler ahead
@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        username = request.form['username']
        if username not in app.config['USERS']:
            error = 'Invalid username'
        elif request.form['password'] != app.config['USERS'][username]["password"]:
            error = 'Invalid password'
        else:
            session['username'] = username
            flash('You were logged in')
            return redirect(url_for('get_game_list'))
    return render_template('login.html', error=error)


@app.route('/logout')
def logout():
    session.pop('username', None)
    flash('You were logged out')
    return redirect(url_for('show_entries'))
