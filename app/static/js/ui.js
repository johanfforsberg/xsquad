/* UI React.js components */

UI = (function () {

    var OverlayComponent = React.createClass({

        render: function () {
            console.log("my turn", this.props.game.my_turn);
            return React.createElement("div", {id: "hud"}, [
                React.createElement("div", {id: "info"}, [
                    this.props.username,
                    React.createElement(TeamComponent, {
                        selected: this.props.game.selectedMember,
                        members: this.props.game.team.members,
                        pathGraph: this.props.game.level.graph,
                        memberClicked: this.props.memberClicked
                    }),
                    React.createElement("div", {className: "turn"},
                                        this.props.game.players.length < 2? "Waiting for an opponent." :
                                        (this.props.game.my_turn? "Your turn!" : "Opponent's turn")),
                    React.createElement("button", {
                        disabled: !this.props.game.my_turn,
                        onClick: this.props.endTurn}, "End Turn")
                ]),
                this.props.game.enemies? React.createElement(EnemiesComponent, {
                    player: this.props.game.players[1],
                    enemies: this.props.game.enemies,
                    enemySelected: this.props.enemySelected
                }): null,
                React.createElement(MessageComponent, {messages: this.props.game.messages})
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
                return React.createElement(
                    "div", {key: i,
                            className: ("member " + (selected === i? "selected" : "")),
                            onClick: function () {self.selectMember(i);}}, [
                                React.createElement("div", {className: "name " +
                                                            (member.health <= 0? "dead" : "alive")},
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
            var enemySelected = this.props.enemySelected,
                enemies = R.map(function (pair) {
                var i = pair[0], enemy = pair[1];
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

    return {
        OverlayComponent: OverlayComponent,
        TeamComponent: TeamComponent,
        EnemiesComponent: EnemiesComponent,
        MessageComponent: MessageComponent
    };
})();
