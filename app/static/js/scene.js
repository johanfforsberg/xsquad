function Scene (element, scale, turn, pitch) {

    var width = element.offsetWidth, height = element.offsetHeight;
    var aspect = width / height;

    var scene = this.scene = new THREE.Scene();

    var renderer = new THREE.WebGLRenderer();
    renderer.setSize( width, height );
    element.appendChild( renderer.domElement );

    this.reinit = function () {
        width = element.offsetWidth, height = element.offsetHeight;
        // element.removeChild(renderer.domElement);
        // renderer = new THREE.WebGLRenderer();
        renderer.setSize( width, height );
        // element.appendChild( renderer.domElement );
        aspect = width / height;

        camera.left = -scale;
        camera.right = scale;
        camera.top = scale/aspect;
        camera.bottom = -scale/aspect;
        camera.updateProjectionMatrix();

        render();
    };

    // The table defines the center of view and rotation for the camera
    var table = this.table = new THREE.Object3D();
    table.rotationAutoUpdate = true;
    table.rotation.x = Math.PI / 2;
    table.rotation.y = -turn / 180 * Math.PI;
    scene.add(table);
    var position = this.position = table.position;

    // The boom defines the camera pitch and distance from the table
    var boom = this.boom = new THREE.Object3D();
    boom.rotationAutoUpdate = true;
    boom.rotation.x = -pitch / 180 * Math.PI;
    table.add(boom);

    var camera = this.camera = new THREE.OrthographicCamera(
            -scale, scale, scale/aspect, -scale/aspect, 10, 1000);
    camera.position.z = 100;
    boom.add(camera);

    var camlight = this.camlight = new THREE.DirectionalLight(0xffffff, 0.1);
    camlight.position = camera.position;
    // camera.add(camlight);

    var light = new THREE.AmbientLight( 0x707070 );
    scene.add( light );

    var skyLight = new THREE.DirectionalLight(0xffffff, 0.1);
    skyLight.position.set(70, 50, 200);
    scene.add(skyLight);

    var rendering = false;

    // this is the render loop. It will always run, but does nothing unless
    // something has changed. In that case it re-renders the scene.
    // (Also, any active Tween animations are updated each frame.)
    var changed = false;
    function loop(t) {
        if (changed) {
            _render();
            changed = false;
        }
        TWEEN.update();
        window.requestAnimationFrame(loop);
    }
    this.start = loop;

    function _render() {

        renderer.render(scene, camera);
    }

    // The render function just tells the loop to rerender next time
    // This means it's safe to call "render" as often as you like;
    // the scene is only rendered at most once per frame anyway.
    var render = this.render = function () {
        changed = true;
    };


    var sprites = [];  // keep track of sprites as they need to be rotated with the scene
                       // TODO: sophisticate this

    this.add = function (obj) {
        this.scene.add(obj);
    };

    this.remove = function (obj) {
        this.scene.remove(obj);
    };

    var callbacks = {};
    this.addCallback = function (event, callback) {
        if (R.has(event, callbacks)) {
            callbacks[event].push(callback);
        } else {
            callbacks[event] = [callback];
        }
    }

    Object.defineProperty(this, "turn", {
        get : function () { return turn; },
        set : function(value) {
            if (value < 0) {
                turn = (value - 360 * Math.floor(value / 360));
            } else {
                turn = value % 360;
            }
            table.rotation.y = -turn / 180 * Math.PI;
            // sprites.forEach(function (sprite) {  // sprites always face the camera
            //     sprite.setTurn(turn);
            // });
            var turnCallbacks = callbacks["turn"];
            if (turnCallbacks)
                turnCallbacks.forEach(function (cb) {cb(turn);});
            render();
        }
    });

    Object.defineProperty(this, "pitch", {
        get : function () { return pitch; },
        set : function(value) {
            pitch = Math.max(-89.9, Math.min(89.9, value));
            boom.rotation.x = -pitch / 180 * Math.PI;
        }
    });

    Object.defineProperty(this, "scale", {
        get : function () { return scale; },
        set : function(value) {
            scale = value;
            camera.left = -scale;
            camera.right = scale;
            camera.bottom = -scale / aspect;
            camera.top = scale / aspect;
            camera.updateProjectionMatrix();
            render();
        }
    });

    // relatively move the view by an offset given in *camera* coordinates
    this.nudge = function (offset) {
        var xscale = this.camera.left, yscale = this.camera.top;
        offset.x = offset.x * xscale;
        offset.y = -offset.y * yscale * 2;
        offset.z = -this.camera.position.z;
        this.table.updateMatrixWorld();
        offset.applyMatrix4(this.camera.matrixWorld);
        this.table.position.x = offset.x;
        this.table.position.y = offset.y;
        render();
    };

    function center (pos) {
        table.position.x = pos[0];
        table.position.y = pos[1];
        render();
    }

    Object.defineProperty(this, "center", {
        get : function () { return table.position.toArray(); },
        set : function(pos) {
            center(pos);
        }
    });

    var raycaster = new THREE.Raycaster();
    var pickPoint = new THREE.Vector3(0, 0, -1);
    var pickDirection = new THREE.Vector3(0, 0, -1);

    // Take a screen coordinate and return whatever objects
    // are intersected by a ray through the scene at that point.
    this.pickObjects = function pickObjects(x, y) {
        pickPoint.set(x, y, -1);
        pickPoint.unproject( camera );
        pickDirection.set(0, 0, -1);
        pickDirection.transformDirection( camera.matrixWorld );
        raycaster.set( pickPoint, pickDirection );
        var intersects = raycaster.intersectObjects(scene.children, true);
        return intersects;
    };

};
