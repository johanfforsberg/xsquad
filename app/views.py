from collections import defaultdict
import json
from pprint import pprint
from random import random
from math import sqrt

from flask import (redirect, url_for, request, jsonify,
                   send_from_directory, Response,
                   render_template, flash, session, abort)
from gevent.queue import Queue

from . import app
# from .forms import LoginForm

from .xsquad.level import Level
from .xsquad.game import Game
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
    enemies = {i: game.inactive_team.people[i] for i in team.enemies_seen()}
    data["enemies"] = enemies
    return jsonify(data)


@app.route('/games/new', methods=['GET'])
def new_game():
    gameid = (max(map(int, games.keys())) + 1) if games else 0
    player = session["username"]
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
    fov, enemies = game.get_team_fov(team)
    disappeared = team.spotted[person] - set(enemies)
    if enemies or disappeared:
        for e in enemies:
            other_team.spotted[e].add(person)
        for e in disappeared:
            other_team.spotted[e].remove(person)
        team.spotted[person] = set(enemies)
    return jsonify({"fov": fov, "enemies": [e.dbdict() for e in enemies]})


@app.route('/games/<int:gameid>/done', methods=["POST"])
def end_turn(gameid):
    game = games[gameid]
    team = game.active_team
    if game.active_player != session["username"]:
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
    team = game.active_team
    opponent_team = game.inactive_team

    attacker_i = request.json["attacker"]
    attacker = team.members[attacker_i]
    target_i = request.json["target"]
    target = opponent_team.members[target_i]

    print attacker_i, "fires at", target_i

    # simple chance-to-hit calculation based on visibility and distance
    origin = (attacker.position[0], attacker.position[1],
              attacker.position[2]+1)
    lower_visibility = game.level.check_visibility(origin, target.position)
    upper_target = (target.position[0], target.position[1],
                    target.position[2]+1)
    upper_visibility = game.level.check_visibility(origin, upper_target)

    if lower_visibility or upper_visibility:
        distance = sqrt((origin[0] - upper_target[0])**2 +
                        (origin[1] - upper_target[1])**2 +
                        (origin[2] - upper_target[2]-0.5)**2)
        chance = ((lower_visibility + upper_visibility) / 2.0) / distance
        print "Distance:", distance
        print "Chance to hit:", chance
        hit = random() < chance

        broadcast(gameid, game.inactive_player, {"type": "opponent_fired",
                                                 "data": {
                                                     "enemy": attacker.name,
                                                     "member": target.name,
                                                     "success": hit
                                                 }})
        return jsonify(success=hit, attacker=attacker.name, target=target.name)

    abort(403)


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
    team = game.active_team

    member_i = request.json.get("person", 0)
    member = team.members[member_i]
    path = request.json["path"]
    rotation = request.json["rotation"]
    stop_for_enemy = not request.json.get("dont_stop")

    # verify that the path can be traversed by the member
    costs = member.check_path(game.level, path)
    if sum(costs, 0) <= member.moves:
        start_fov, start_enemies = game.get_team_fov(team, exclude_members=[member_i])
        fov_diffs = []
        enemy_diffs = []
        last_fov, last_enemies = game.get_fov(team, member_i)
        seen_paths = []
        if last_enemies:
            seen_paths.append([path[0]])
        seen_at_end = False
        last_pos = path[0]
        for i, (pos, rot) in enumerate(zip(path[1:], rotation)):
            member.position = pos
            member.rotation = rot

            fov, enemies = game.get_fov(team, member_i)

            # calculate the positions that are newly visible / no longer visible
            fov_add = dict((key, sides) for key, sides in fov.items()
                           if key not in last_fov and key not in start_fov)
            fov_remove = dict((key, sides) for key, sides in last_fov.items()
                              if key not in fov and key not in start_fov)
            fov_diffs.append([fov_add, fov_remove])
            last_fov = fov

            # same thing for enemies
            enemy_add = [e.dbdict() for e in enemies
                         if e not in last_enemies and e not in start_enemies]
            enemy_remove = [e.dbdict() for e in last_enemies
                            if e not in enemies and e not in start_enemies]
            enemy_diffs.append([enemy_add, enemy_remove])

            # store visibility information for opponent
            if enemies:
                if last_enemies:
                    seen_paths[-1].append(pos)
                else:
                    seen_paths.append([last_pos, pos])
                seen_at_end = True
            else:
                if last_enemies:
                    seen_paths[-1].append(pos)
                seen_at_end = False

            last_enemies = enemies
            last_pos = pos

            if stop_for_enemy and enemy_add:  # break early if enemies seen
                break

        member.moves -= sum(costs)
        if seen_paths:  # update opponent about movements in vicinity
            broadcast(gameid, game.inactive_player,
                      {"type": "opponent_visible",
                       "data": {"enemy": member.dbdict(),  # TODO: restrict info
                                "paths": seen_paths,  # the movement seen
                                "seen_at_end": seen_at_end}})  # visible at end of move?

        # return the actual path - which is always a subset of the one asked
        # for (may change) - the FOV updates and any enemies that were spotted
        return jsonify(dict(path=path[:i+2], team=team.dbdict(),
                            fov_diffs=fov_diffs, enemy_diffs=enemy_diffs,
                            enemies=[e.dbdict() for e in (
                                set(last_enemies) | set(start_enemies))]))
    else:
        abort(403)


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
    if game and player:
        if game.waiting and player not in game.players:
            game.join(player)
            broadcast(gameid, game.active_player, {
                "type": "opponent_joined",
                "data": {"players": game.players, "my_turn": True}})
        return render_template('game.html', gameid=gameid,
                               team=game.players.index(player),
                               username=session["username"])
    else:
        abort(403)


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
