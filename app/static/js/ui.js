/* UI React.js components */

UI = (function () {

    var cx = React.addons.classSet;

    var OverlayComponent = React.createClass({

        render: function () {
            console.log("my turn", this.props.game.my_turn);
            return React.createElement("div", {id: "hud"}, [
                React.DOM.div({id: "info"}, [
                    this.props.username,
                    React.createElement(TeamComponent, {
                        selected: this.props.game.selectedMember,
                        members: this.props.game.team.members,
                        pathGraph: this.props.game.level.graph,
                        memberClicked: this.props.memberClicked
                    }),
                    React.DOM.div({className: "turn"},
                                  this.props.game.players.length < 2? "Waiting for an opponent." :
                                  (this.props.game.my_turn? "Your turn!" : "Opponent's turn")),
                    React.DOM.button({
                        disabled: !this.props.game.my_turn,
                        onClick: this.props.endTurn}, "End Turn")
                ]),
                this.props.game.enemies? React.createElement(EnemiesComponent, {
                    player: this.props.game.players[1],
                    enemies: this.props.game.enemies,
                    enemySelected: this.props.enemySelected
                }): null,
                React.createElement(MessageComponent, {messages: this.props.game.messages}),
                React.createElement(LevelComponent, {levels: this.props.levels})
            ]);
        }

    });

    var TeamComponent = React.createClass({

        selectMember: function (n) {
            this.props.memberClicked(n, n == this.props.selected);
        },

        render: function () {
            var self = this;
            var selected = this.props.selected;
            var members = this.props.members.map(function (member, i) {
                return React.DOM.div({
                    key: i,
                    className: ("member " + (selected === i? "selected" : "")),
                    onClick: function () {self.selectMember(i);}}, [
                        React.DOM.div({className: "name " +
                                       (member.health <= 0? "dead" : "alive")},
                                      "Name: " + member.name),
                        React.DOM.div(null, "Health:" + member.health +"/"+ member.maxhealth),
                        React.DOM.div(null, "Moves:" + member.moves +"/"+ member.speed)
                ]);
            });
            return React.DOM.div(null, members);
        }
    });

    var EnemiesComponent = React.createClass({

        render: function () {
            var enemySelected = this.props.enemySelected,
                enemies = R.map(function (pair) {
                var i = pair[0], enemy = pair[1];
                    return React.DOM.div(
                        {key: i, className: "enemy",
                         onClick: function () {enemySelected(i);}}, [
                             React.createElement("div", {className: enemy.dead? "dead" : "alive"},
                                                 "Name: " + enemy.name)
                         ]);
            }, R.toPairs(this.props.enemies));
            return React.DOM.div({id: "enemies"}, enemies);
        }

    });

    var MessageComponent = React.createClass({

        render: function () {
            var messages = R.take(5, R.reverse(this.props.messages)).map(function (msg, i) {
                return React.DOM.div({key: i, className: "message " + (i == 0? "latest": "old")}, msg);
            })
            //console.log("MessageComponent", this.props.messages);
            return React.DOM.div({id: "messages"}, messages);
        }

    });

    var LevelComponent = React.createClass({

        shouldComponentUpdate: function (props) {
            return props.levels.maxLevel > props.levels.minLevel;
        },

        render: function () {
            var maxLevel = this.props.levels.maxLevel,
                minLevel = this.props.levels.minLevel,
                maxDisplayed = this.props.levels.maxDisplayed,
                setLevel = this.props.levels.setLevelDisplayMax;
            var levels = R.map(
                function (lvl) {
                    var classes = cx({level: true, shown: lvl <= maxDisplayed})
                    return React.DOM.div({className: classes,
                                          onClick: function () {setLevel(lvl)}});
                },
                R.reverse(R.range(minLevel, maxLevel+1)));
            return React.DOM.div({id: "levels"}, [
                React.DOM.div({className: "levels"}, levels)
            ])
        }

    })

    return OverlayComponent;

})();
