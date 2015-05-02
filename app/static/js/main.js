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


    /* React.js UI components */

    var OverlayComponent = React.createClass({

        render: function () {
            console.log("my turn", this.props.my_turn);
            return React.createElement("div", {id: "hud"}, [
                React.createElement("div", {id: "info"}, [
                    username,
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
                React.createElement(MessageComponent, {messages: this.props.messages})
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
                                React.createElement("div", {className: "name " + (member.health <= 0? "dead" : "alive")},
                                                    "Name: " + member.name),
                                React.createElement("div" , null, "Health:" + member.health +"/"+ member.maxhealth),
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
                                React.createElement("div", {className: enemy.dead? "dead" : "alive"},
                                                    "Name: " + enemy.name)
                            ]);
            }, R.toPairs(this.props.enemies));
            return React.createElement("div", {id: "enemies"}, enemies);
        }
    });

    var MessageComponent = React.createClass({

        render: function () {
            var messages = R.take(5, R.reverse(this.props.messages)).map(function (msg, i) {
                return React.createElement(
                    "div", {key: i, className: "message " + (i == 0? "latest": "old")}, msg);
            })
            //console.log("MessageComponent", this.props.messages);
            return React.createElement("div", {id: "messages"}, messages);
        }

    });

    /* end React.js stuff */


    var game;  // this is where all the game state is kept!
    var view;  // The isometric 3d view
    var graph;  // handle the path graph for movement

    // Kick it all into action after fetching the current game state
    $.ajax(gameId + "/state", {
        success: startUp
    });

    // Set everything up using the game data from the server
    function startUp(gameState) {

        console.log("startUp", gameState);

        game = gameState;
        game.messages = []
        graph = new PathGraph(game.level.graph);
        console.log("graph", graph);

        // the isometric game view
        view = new View(document.getElementById("view"));

        view.makeWorld(game.level);
        view.updateTeam(game.team);

        view.addCallback("clickPosition", positionClicked);
        view.addCallback("clickMember", memberClicked);
        view.addCallback("clickEnemy", enemyClicked);
        // Debouncing because we want the path to be displayed when
        // the player has hovered on a position for a little while,
        // not immediately.
        view.addCallback("hoverPosition", _.debounce(showPath, 500));

        view.centerView(game.team.members[0].position, false);

        view.addCallback("done", function () {loadView(view.updateFOV)});

        // This is inefficient; first we're getting the game state, then
        // we're waiting for the textures to load before asking the server
        // for the field-of-view. This should be more parallell-y.

        renderUI();
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
                renderUI();
            }
        });
    }

    // Callbacks for various interactions

    function showPath(pos) {
        if (game.selectedMember == undefined)
            return;
        var member = game.team.members[game.selectedMember],
            startPos = member.position,
            path = graph.findPath(point2key(startPos), point2key(pos), member.moves);
        console.log(path);
        if (path && path.points && path.cost <= member.moves) {
            var pointPath = path.points.map(key2point);
            view.showPath("hover", pointPath);  // feels like reaching a bit too
                                                // far into the view here...
        } else {
            view.showPath("hover");
        }
    }

    function memberClicked(i, center) {
        var member = game.team.members[i];
        if (member.health > 0) {
            view.selectTeamMember(i);
            game.selectedMember = i;
            if (center) {
                view.centerView(game.team.members[i].position, true);
            }
        } else {
            game.messages.push("Member " + i + " is out of action!");
        }
        renderUI();
    }

    function enemyClicked(i) {
        if (game.my_turn) {
            if (game.selectedMember !== undefined) {
                shootAtEnemy(game.selectedMember, i);
            }
        } else {
            game.messages.push("Not your turn; can't attack!");
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
            game.messages.push("Not your turn, can't move!");
            renderUI();
        }
    }

    function endTurn () {
        $.ajax(gameId + "/done", {
            type: "POST",
            success: function (data) {
                game = R.merge(game, data);
                game.messages.push("Waiting for opponent...");
                renderUI();
            }
        });
    }

    // helpers

    function moveTeamMember (i, pos) {
        var member = game.team.members[i];
        var path = graph.findPath(point2key(member.position),
                                  point2key(pos));
        if (path.points && path.cost < member.moves) {
            path = path.points.map(key2point);
            moveAlongPath(parseInt(member.name), path, function (result) {
                game.team = result.team;
                var callback;
                callback = function () {
                    if (result.path.length < path.length)
                        game.messages.push("Enemy spotted; stopping!");
                    renderUI();
                }
                view.moveTeamMember(member.name, result.path, path,
                                    result.fov_diffs, result.enemy_diffs, 500,
                                    true, callback);
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
            error: function (result) {
                game.messages.push(member + " can't move there");
                renderUI();
            },
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
                game.messages.push(member + " can't fire at enemy " + enemy + "!");
                renderUI();
            },
            success: function (result) {
                game.messages.push(member + " fired at enemy " +
                                   (result.success? "and hit!" : "but missed."));
                // renderUI();
                member = game.team.members[result.attacker.name];
                console.log("attacker", member);
                member.moves = result.attacker.moves;
                enemy = game.enemies[result.target.name];
                enemy = game.enemies[result.target.name] = R.merge(enemy, result.target);
                view.updateEnemyTeam({members: [result.target]});
                view.shotsFired(member, enemy, true);
                renderUI();
            }});
    }


    /* setup subscription to SSE events from the server */

    var source = new EventSource("/games/" + gameId + '/subscribe');

    source.addEventListener("open", function (e) {
        console.log("SSE opened!");
    });

    source.addEventListener("error", function (e) {
        game.messages.push("*** Server error! ***")
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
            game.messages.push("---Player " + new_player + " joined! Your turn.---");
            break;
        case "opponent_done":
            console.log("OPPONENT DONE; YOUR TURN!", msg.data);
            game.my_turn = true;
            game.messages.push("---Opponent done; your turn!---");
            break;
        case "opponent_visible":
            console.log("ENEMY SEEN:", msg.data.paths, msg.data.seen_at_end);
            game.messages.push("Enemy movement spotted! " +
                               (!msg.data.seen_at_end? " Moved out of sight." : ""));
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
            game.messages.push("Opponent fired at " + msg.data.target.name +
                               (msg.data.success? " and hit!" : " but missed!"));
            var member = game.team.members[msg.data.target.name];
            member.health = msg.data.target.health;
            var enemy = game.enemies[msg.data.attacker.name];
            view.shotsFired(enemy, member, false);
            break;
        case "game_lost":
            game.messages.push("+++You have lost the game!+++");
            break;
        case "game_won":
            game.messages.push("+++You have won the game!+++");
            break;
        }

        renderUI();
    });

});
