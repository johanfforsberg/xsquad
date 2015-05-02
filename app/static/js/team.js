TeamView = (function () {

    function Team (teamData, turn, isEnemy) {

        console.log("Team", teamData);

        this.obj = new THREE.Object3D();
        // this.members = {};
        if (isEnemy)
            this.obj.name = "enemies";
        else
            this.obj.name = "team";
        var sprites = this.sprites = [];

        var _selected = -1;

        teamData.members.forEach(function (member, i) {
            // this.members[member.name] = member;
            var sprite = new Sprite(member.name, 8, 1, 2, member.vision,
                                    member.rotation, turn, isEnemy);
            sprite.position.set(member.position[0], member.position[1],
                                member.position[2]);
            sprite.obj.visible = member.visible;
            sprite.dead = member.health <= 0;
            console.log("sprite", sprite);
            sprites.push(sprite);
            sprite.selected = isEnemy || (i === _selected);
            this.obj.add(sprite.obj);
        }, this);

        console.log("getting character texture");
        THREE.ImageUtils.loadTexture(
            "/images/character_walk.png", undefined,
            function (texture) {
                console.log("char text", texture);
                sprites.forEach(function (sprite) {
                    sprite.texture = texture;
                });
            }
        );

        Object.defineProperty(this, "selected", {
            get: function () {return _selected;},
            set: function (i) {
                this.sprites[_selected].selected = false;
                this.sprites[i].selected = true;
                _selected = i;
            }
        });

    }

    Team.prototype.select = function (i) {
        if (this._selected >= 0) {
            this.sprites[this._selected].selected = false;
        }
        this.sprites[i].selected = true;
        this._selected = i;
    };

    Team.prototype.update = function (teamData) {
        console.log("Team update", teamData);
        teamData.members.forEach(function (member) {
            var sprite = this.sprites[parseInt(member.name)];
            if (R.has("position", member))
                sprite.position.set(member.position[0], member.position[1], member.position[2]);
            if (R.has("rotation", member))
                sprite.rotation = member.rotation;
            if (R.has("health", member))
                sprite.dead = member.health <= 0;
            else
                sprite.dead = member.dead
        }, this);
    };

    Team.prototype.hideAll = function () {
        this.sprites.forEach(function (sprite) {sprite.obj.visible = false;});
    };

    Team.prototype.findMemberSprite = function (name) {
        return this.sprites[parseInt(name)];
    };

    Team.prototype.showMember = function (name) {
        console.log("showMember", name, this.sprites);
        var member = this.sprites[parseInt(name)]
        member.obj.visible = true;
    };

    Team.prototype.hideMember = function (name) {
        console.log("hideMember", name)
        this.sprites[parseInt(name)].obj.visible = false;
    };

    Team.prototype.markMemberDead = function (name) {
        var sprite = this.sprites[parseInt(name)];
        console.log("markMemberdead", name, sprite);
        sprite.material.opacity = 0.5;
    };

    Team.prototype.hideDeadMembers = function () {
        this.members.forEach(function (sprite) {

        });
    };

    Team.prototype.setTurn = function (turn) {
        this.sprites.forEach(function (sprite) {
            sprite.setTurn(turn);
        }, this);
    };

    Team.prototype.isAnyoneAt = function (pos) {
        console.log("isAnyoneAt", pos);
        for (var i=0; i < this.sprites.length; i++) {
            var mpos = this.sprites[i].position;
            console.log(i, mpos);
            if (mpos.x === pos[0] && mpos.y === pos[1] && mpos.z === pos[2])
                return i;
        }
        return -1;
    };

    return Team;

})();
