/* This is the "entrypoint" where things get started up */


// some global helpers to deal with level data

function key2point(key) {
    var z = key >> 16;
    var y = (key >> 8) - z * 256;
    var x = key - y*256 - z*256*256;
    return [x, y, z];
}


function getSidesArray (sides) {
    var b = [];
    for (var i = 0; i < 6; i++) {
        if (sides[i] != ".")
            b.push(i);
    }
    return b;
}

function point2key(point) {
    return point[0] + (point[1] << 8) + (point[2] << 16);
}


window.addEventListener("load", function () {

    // these values are supplied by the server through the HTML template
    var gameId = document.getElementById("game-id").value;
    var username = document.getElementById("username").value;

    // the isometric game view
    var view = new View(document.getElementById("view"));


    /* React.js UI components */

    var OverlayComponent = React.createClass({

        render: function () {
            return React.createElement("div", {id: "hud"}, [
                React.createElement("div", {id: "info"}, [
                    this.props.players[0] + "'s team:",
                    React.createElement(TeamComponent, {
                        selected: this.props.selectedMember,
                        members: this.props.team.members,
                        pathGraph: this.props.level.graph
                    }),
                    React.createElement("div", {className: "turn"},
                                        this.props.players.length < 2? "Waiting for an opponent." :
                                        (this.props.my_turn? "Your turn!" : "Opponent's turn")),
                    React.createElement("button", {
                        disabled: !this.props.my_turn,
                        onClick: endTurn}, "End Turn")
                ]),
                this.props.enemies? React.createElement(EnemiesComponent, {
                    player: this.props.players[1],
                    enemies: this.props.enemies
                }): null,
                React.createElement(MessageComponent, {message: this.props.message})
            ]);
        }

    });

    var TeamComponent = React.createClass({

        selectMember: function (n) {
            memberClicked(n, n == this.props.selected);
        },

        render: function () {
            var self = this;
            var members = this.props.members.map(function (member, i) {
                return React.createElement(
                    "div", {key: i,
                            className: ("member " + (self.props.selected === i? "selected" : "")),
                            onClick: function () {self.selectMember(i);}}, [
                    React.createElement("div", null, "Name: " + member.name),
                    React.createElement("div" , null, "Moves:" + member.moves +"/"+ member.speed)
                ]);
            });
            return React.createElement("div", null, members);
        }
    });

    var EnemiesComponent = React.createClass({

        render: function () {
            var enemies = R.map(function (pair) {
                var i = pair[0];
                var enemy = pair[1];
                return React.createElement(
                    "div", {key: i, className: "enemy",
                            onClick: function () {enemySelected(i);}}, [
                    React.createElement("div", null, "Name: " + enemy.name)
                ]);
            }, R.toPairs(this.props.enemies));
            return React.createElement("div", {id: "enemies"}, enemies);
        }
    });

    var MessageComponent = React.createClass({

        render: function () {
            console.log("MessageComponent", this.props.message);
            return React.createElement("div", {id: "message"}, this.props.message);
        }

    });

    /* end React.js stuff */


    var game;   // this is where all the game state is kept!

    // Kick it all into action
    $.ajax(gameId + "/state", {
        success: startUp
    });

    // Set everything up using the game data from the server
    function startUp(gameState) {

        console.log("startUp", gameState);

        game = gameState;
        renderUI();

        view.makeWorld(game.level);
        view.updateTeam(game.team);

        view.addCallback("clickPosition", positionClicked);
        view.addCallback("clickMember", memberClicked);
        view.addCallback("clickEnemy", enemyClicked);

        view.centerView(game.team.members[0].position, false);

        view.addCallback("done", function () {loadView(view.updateFOV)});

        // This is inefficient; first we're getting the game state, then
        // we're waiting for the textures to load before asking the server
        // for the field-of-view. This should be more parallell-y.

    }

    // render the overlay "HUD"
    function renderUI () {
        React.render(
            React.createElement(OverlayComponent, game),
            document.getElementById("overlay")
        );
    }

    // Get the current field of view from the server
    function loadView(callback) {
        var t0 = (new Date()).getTime();
        $.ajax(gameId + "/fov", {
            success: function (data) {
                console.log("loadView took", (new Date()).getTime() - t0);
                if (!game.enemies)
                    game.enemies = {}
                data.enemies.forEach(function (enemy) {
                    game.enemies[enemy.name] = enemy;
                });
                callback(data.fov, data.enemies);
            }
        });
    }

    // Callbacks for various interactions

    function memberClicked(i, center) {
        view.selectTeamMember(i);
        game.selectedMember = i;
        if (center) {
            view.centerView(game.team.members[i].position, true);
        }
        renderUI();
    }

    function enemyClicked(i) {
        if (game.my_turn) {
            if (game.selectedMember !== undefined) {
                shootAtEnemy(game.selectedMember, i);
            }
        } else {
            game.message = "Not your turn; can't attack!";
            renderUI();
        }
    }

    function enemySelected(i) {
        view.centerView(game.enemies[i].position, true);
    }

    function positionClicked(pos) {
        if (game.my_turn) {
            if (game.selectedMember !== undefined) {
                moveTeamMember(game.selectedMember, pos);
            }
        } else {
            game.message = "Not your turn, can't move!";
            renderUI();
        }
    }

    function endTurn () {
        $.ajax(gameId + "/done", {
            type: "POST",
            success: function (data) {
                game = R.mixin(game, R.mixin(data, {message: "Waiting for opponent..."}));
                renderUI();
            }
        });
    }

    // helpers

    function moveTeamMember (i, pos) {
        var member = game.team.members[i];
        var path = Path.findPath(point2key(member.position),
                                 point2key(pos), game.level.graph);
        if (path) {
            path = path.map(key2point);
            moveAlongPath(parseInt(member.name), path, function (result) {
                game.team = result.team;
                if (result.path.length < path.length) {
                    game.message = "Enemy spotted; stopping!"
                }
                renderUI(result);
                view.moveTeamMember(member.name, result.path,
                                    result.fov_diffs, result.enemy_diffs, 500);
            });
        }
    }

    // calculate the angle of movement between two points
    function getDirection (from, to) {
        var dx = to[0] - from[0], dy = to[1] - from[1];
        if (dx != 0) {
            return -Math.sign(dx) * 90 -  180/Math.PI * Math.atan(dy/dx);
        } else {
            return 90 + 180/Math.PI * Math.asin(dy);
        }
    }


    function moveAlongPath(member, path, callback) {
        var directions = R.zipWith(getDirection, path, path.slice(1));
        $.ajax(gameId + "/movepath", {
            type: "POST",
            dataType: "json",
            contentType: "application/json",
            data: JSON.stringify({person: member, path: path, rotation: directions}),
            success: function (result) {
                game.enemies = {};
                result.enemies.forEach(function (enemy) {
                    game.enemies[enemy.name] = enemy;
                });
                callback(result);
            }
        });
    }


    function shootAtEnemy(member, enemy) {
        console.log("shootAtEnemy", member, enemy);
        $.ajax(gameId + "/shoot", {
            type: "POST",
            dataType: "json",
            contentType: "application/json",
            data: JSON.stringify({attacker: member, target: enemy}),
            error: function (result) {
                game.message = member + " can't see enemy " + enemy + "!";
                renderUI();
            },
            success: function (result) {
                game.message = member + " fired at enemy " +
                    (result.success? "and hit!" : "but missed.");
                renderUI();
                member = game.team.members[result.attacker];
                enemy = game.enemies[result.target];
                view.shotsFired(member.position, enemy.position);
            }});
    }


    /* setup subscription to SSE events from the server */

    var source = new EventSource("/games/" + gameId + '/subscribe');

    source.addEventListener("open", function (e) {
        console.log("SSE opened!");
    });

    source.addEventListener("error", function (e) {
        console.log("SSE error!", e);
    });

    source.addEventListener("message", function (e) {
        console.log("SSE:", e.data);
        var msg = JSON.parse(e.data);
        switch(msg.type) {
        case "opponent_joined":
            console.log("OPPONENT JOINED; YOUR TURN!", msg.data);
            game.my_turn = true;
            game.players = msg.data.players;
            var new_player = game.players[1];
            game.message = "Player " + new_player + " joined! Your turn.";
            break;
        case "opponent_done":
            console.log("OPPONENT DONE; YOUR TURN!", msg.data);
            game.my_turn = true;
            game.message = "Opponent done; your turn!";
            break;
        case "opponent_visible":
            console.log("ENEMY SEEN:", msg.data.paths, msg.data.seen_at_end);
            game.message = "Enemy movement spotted! " +
                (!msg.data.seen_at_end? " Moved out of sight." : "");
            var paths = msg.data.paths;
            var enemy = msg.data.enemy;
            game.enemies[enemy.name] = enemy;
            var i = 0;
            function showPath() {
                if (i < paths.length) {
                    var showAfter = msg.data.seen_at_end && i == (paths.length - 1);
                    view.moveEnemyMember(parseInt(enemy.name), paths[i], null, null, 500, showPath, !showAfter);
                    i++;
                }
            }
            showPath();
            break;
        case "opponent_fired":
            game.message = "Opponent fired at " + msg.data.member +
                (msg.data.success? " and hit!" : " but missed!");
            var member = game.team.members[msg.data.member];
            var enemy = game.enemies[msg.data.enemy];
            view.shotsFired(enemy.position, member.position);
            break;
        }
        renderUI();
    });

});
