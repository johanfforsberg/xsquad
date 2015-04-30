/* A sprite is a 2D image of something, e.g. a character.
 It may consist of several images showing the item from
 different angles */

Sprite = function (name, directions, width, height, radius, rotation, turn, isEnemy) {

    var obj = this.obj = new THREE.Object3D();
    obj.name = name;
    this.position = obj.position;
    this.directions = directions;

    // var box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 2), new THREE.MeshBasicMaterial({wireframe: true}));
    // box.position.z = 0.5;
    // obj.add(box);

    if (!isEnemy) {
        var sightLight = new THREE.PointLight(0xffffff, 0.7, radius*1);
        sightLight.position.z = 1;
        obj.add(sightLight);
    }

    this._section = 360 / directions;

    this._rotation = rotation || 0;  // the sprite's rotation in the world
    this._viewTurn = turn || 0;   // the rotation of the camera
    this.obj.rotation.z = - turn / 180 * Math.PI;

    function makeCursor(sides, color) {
        var material = new THREE.LineDashedMaterial(
            { color: color, linewidth: 3, dashSize: 10, gapSize: 10,
              transparent: false, opacity: 0.5});
        var geometry = new THREE.Geometry();
        var size = 0.45;

        var steps = sides, angle;
        for (var i = 0; i <= steps; i++) {
            angle = 2 * Math.PI / steps * i;
            geometry.vertices.push(
                new THREE.Vector3( size * Math.cos(angle), size * Math.sin(angle), -.49 )
            );
        };
        var line = new THREE.Line( geometry, material, THREE.LineStrip );
        return line;
    }

    function makeShadow() {
        var canvas = document.createElement("canvas"),
            context = canvas.getContext("2d");
        canvas.width = canvas.height = 16;
        var gradient = context.createRadialGradient(8, 8, 8, 8, 8, 0);
        gradient.addColorStop(0.2, "transparent");
        gradient.addColorStop(0.8, "rgba(0,0,0,0.3)");

        context.fillStyle = gradient;
        context.fillRect(0, 0, 16, 16);

        var texture = new THREE.Texture(canvas)
        texture.needsUpdate = true;

        var material = new THREE.MeshLambertMaterial({map: texture});
        material.transparent = true;

        var plane = new THREE.PlaneBufferGeometry(1, 1);
        var sprite = new THREE.Mesh(plane, material);
        sprite.position.z = -.45;

        return sprite;
    }

    function makeLabel(text) {
        var canvas = document.createElement("canvas"),
            context = canvas.getContext("2d");

        context.font = "Bold 30px Arial";

        var metrics = context.measureText(text);
        var textWidth = metrics.width;

        canvas.width = textWidth;
        canvas.height = 30;
        context.font = "Bold 30px Arial";

        context.fillStyle = "black";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "rgb(0,255,0)";
        context.fillText(text, 0, 25);

        var texture = new THREE.Texture(canvas)
        texture.needsUpdate = true;
        var spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        var sprite = new THREE.Sprite( spriteMaterial );
        sprite.scale.set(.12, .25, 1);
        sprite.position.z += 1.5;
        return sprite
    }

    if (isEnemy) {
        var marker = makeCursor(8, 0xff4040);
        marker.visible = false;
        this.obj.add(marker);
    } else {
        var marker = makeCursor(20, 0x44ff44);
        marker.visible = false;
        this.obj.add(marker);
        label = makeLabel(name);
        console.log("label", label);
        label.visible = true;
        this.obj.add(label);
    }

    Object.defineProperty(this, "texture", {
        set: function (value) {
            var texture = value.clone();  // I think this is a shallow clone; sharing image?
            texture.needsUpdate = true;

            console.log("texture", texture);

            this.material = new THREE.MeshLambertMaterial({map: texture});
            this.material.transparent = true;

            this.material.map.magFilter = THREE.NearestFilter;
            this.material.map.repeat.x = 1/directions;
            this.material.map.repeat.y = 1/4;
            // material.map.premultiplyAlpha = true;

            var plane = new THREE.PlaneBufferGeometry( width, height);
            var sprite = new THREE.Mesh(plane, this.material);
            sprite.name = "sprite";
            // some magic numbers, for now
            sprite.position.z = 0.45;
            sprite.position.y = -0;
            sprite.rotation.x = 60 / 180 * Math.PI;  // this needs to be suited to the
            console.log("this._viewTurn", this._viewTurn)
            // sprite.rotation.z = this._viewTurn / 180 * Math.PI;
            this.updateOffset();
            this.obj.add(sprite);

            var shadow = makeShadow();
            this.obj.add(shadow);

        }
    });

    Object.defineProperty(this, "rotation", {
        get: function () {return this._rotation;}.bind(this),
        set: function (value) {
            this._rotation = value;
            this.updateOffset();
        }
    });

    Object.defineProperty(this, "selected", {
        //get: function () {return this._selected;},
        set: function (value) {
            console.log("selecting", this.obj.name);
            // this._selected = value;
            marker.visible = isEnemy || value;
        }
    });

    var frame = 2;
    Object.defineProperty(this, "frame", {
        get: function () {return frame},
        set: function (value) {
            if (this.material)
                this.material.map.offset.y = (1+value)/4;
        }
    });

};


function clampAngle(angle) {
    if (angle > 360)
        return angle % 360;
    if (angle < 0)
        return 360 - Math.abs(angle) % 360;
    return angle;
}


Sprite.prototype.updateOffset = function () {
    // set the texture material's offset so that the image for the correct direction
    // facing the camera is shown.
    var offset = Math.round(clampAngle(this._rotation - this._viewTurn) / this._section) * 1 / this.directions;
    if (offset === 1) {
        offset = 0;
    }
    if (this.material) {
        this.material.map.offset.x = offset;
        this.material.map.offset.y = 3/4;
    }
};

Sprite.prototype.setTurn = function (turn) {
    this._viewTurn = turn;
    this.obj.rotation.z = -turn / 180 * Math.PI;
    this.updateOffset();
};


Sprite.prototype.addCallback = function (event, callback) {
    if (R.has(event, this.callbacks))
        this.callbacks[event].push(callback);
    else
        this.callbacks[event] = [callback];
}
