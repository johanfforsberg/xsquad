/* The 3d view of the game */

View = (function () {

    var scene;

    var dark = {r: 0.2, g: 0.2, b: 0.6},
        darkColor = new THREE.Color(dark.r, dark.g, dark.b),
        darkAmbient = new THREE.Color(0.1, 0.2, 0.5),
        bright = {r: 0.9, g: 0.9, b: 0.9},
        brightColor = new THREE.Color(bright.r, bright.g, bright.b),
        brightAmbient = new THREE.Color(0.2, 0.2, 0.2);

    var helpers = new Mesh();

    var geoCache = {}, materialCache = {};

    var walls = {};
    var levels = {};
    var team, enemyTeam;

    // create textures from the map
    function makeTextureMaps(img) {
        var n = img.width / 16;
        var textures = [];
        for (var i=0; i < n; i++) {
            var texture = new THREE.Texture(img);
            texture.needsUpdate = true;  // arrgh!
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            texture.repeat.x = 1 / n;
            texture.offset.x = i / n;
            texture.wrapT = texture.wrapS = THREE.RepeatWrapping;
            textures.push(texture);
        }
        return textures;
    }


    // create a 3d model of the world data
    function makeWorld (levelData) {
        var group = new THREE.Object3D();
        group.name = "walls";

        var loader = new THREE.ImageLoader();

        loader.load("/images/wall.png", function (wallImage) {

            var wallTextures = makeTextureMaps(wallImage);
            var mesh, vertices, normals, geometry, material;

            Object.keys(levelData.walls).forEach(function (key) {
                var tmp = new THREE.Object3D();
                var point = key2point(key);
                var sides = levelData.walls[key];
                var sidesArray = getSidesArray(sides);
                var brightness = 0.1 ; //0.9 + Math.random()*0.1;
                var color = darkColor;
                var wallMaterials = {};
                sidesArray.forEach(function (side, i) {
                    material = new THREE.MeshPhongMaterial(
                        {map: wallTextures[levelData.walltypes[sides[side]]],
                         shininess: 0,
                         ambient: darkAmbient, color: darkColor});
                    if (side in geoCache)
                        geometry = geoCache[side];
                    else
                        geometry = helpers.makeSide(side, 1);
                    mesh = new THREE.Mesh(geometry, material);
                    tmp.add(mesh);
                    wallMaterials[side] = material;
                });
                tmp.position.set(point[0], point[1], point[2]);
                tmp._materials = wallMaterials;
                tmp._key = key;
                tmp._sides = sidesArray;
                walls[key] = tmp;
                // var z;
                // if (levelData.walls[point2key([point[0], point[1], point[2]-1])] &&
                //     R.contains(4, sidesArray))
                //     z = point[2]-1;
                // else
                var z = point[2];
                if (z in levels) {
                    levels[z].add(tmp);
                } else {
                    var level = new THREE.Object3D();
                    levels[z] = level;
                    level.add(tmp);
                    group.add(level);
                }
                levelDisplayMax = Math.max(levelDisplayMax, point[2]);
            });
            levelDisplayMaxCeiling = levelDisplayMax;
            scene.add(group);
            scene.start();

            runCallbacks("done");
            // TODO: This callback business is ugly and will break as soon as
            // we have to load more than one texture. Need to either do this
            // more asynchronously; i.e. apply textures as they are loaded
            // (which I find ugly) or wait until they are all loaded. But we
            // don't want to block *loading* the view, just displaying it.
        });

    }

    function setWallColor (wall, color, ambient) {
        Object.keys(wall._materials).forEach(function (side) {
            wall._materials[side].color = color;
            if (ambient) wall._materials[side].ambient = ambient;
        });
    }

    var oldView = {}, reallyOld = {};
    function updateFOV (newView, newEnemies) {

        /* The idea here is to smoothly update the color of the walls
         that go in or out of view, from shadow to light or vice versa,
         This is done by using two THREE.Color objects, one for each
         direction, and setting all the relevant walls' material color
         to one of these. Then we use Tween.js to make the transitions. */

        enemyTeam.hideAll();
        enemyTeam.update({members: newEnemies});
        newEnemies.forEach(function (enemy) {
            enemyTeam.showMember(enemy.name);
        });

        var darkTweenColor = new THREE.Color(dark.r, dark.g, dark.b),
            brightTweenColor = new THREE.Color(bright.r, bright.g, bright.b);
        var wall;

        // first clean up walls that have been darkened
        Object.keys(reallyOld).forEach(function (key) {
            wall = walls[key];
            setWallColor(wall, darkColor);
        });
        reallyOld = {};

        // we want to brighten any newly seen walls
        Object.keys(newView).forEach(function (key) {
            wall = walls[key];
            if (wall && !(key in oldView)) {
                setWallColor(wall, darkTweenColor, brightAmbient);
            } else {
                setWallColor(wall, brightColor, brightAmbient);
            }
        });

        // and darken walls that are no longer seen
        Object.keys(oldView).forEach(function (key) {
            wall = walls[key];
            if (wall && !(key in newView)) {
                setWallColor(wall, brightTweenColor, darkAmbient);
                reallyOld[key] = wall;
            }
        });

        // animate dark -> bright and vice versa
        new TWEEN.Tween(darkTweenColor).to(bright, 500)
            .onUpdate(scene.render).start();
        new TWEEN.Tween(brightTweenColor).to(dark, 500)
            .onUpdate(scene.render).start();

        oldView = newView;
    }

    var oldAdded = {}, oldRemoved = {};

    function updateFOVDiff (newView) {

        /* The idea here is to smoothly update the color of the walls
         that go in or out of view, from shadow to light or vice versa,
         This is done by using two THREE.Color objects, one for each
         direction, and setting all the relevant walls' material color
         to one of these. Then we use Tween.js to make the transitions. */

        var darkTweenColor = new THREE.Color(dark.r, dark.g, dark.b),
            brightTweenColor = new THREE.Color(bright.r, bright.g, bright.b);
        var wall;

        Object.keys(oldAdded).forEach(function (key) {
            wall = walls[key];
            setWallColor(wall, brightColor, brightAmbient);
        });

        // first clean up walls that have been darkened
        Object.keys(oldRemoved).forEach(function (key) {
            wall = walls[key];
            setWallColor(wall, darkColor);
        });

        // we want to brighten any newly seen walls
        Object.keys(newView[0]).forEach(function (key) {
            wall = walls[key];
            if (wall)
                setWallColor(wall, darkTweenColor, brightAmbient);
        });
        oldAdded = newView[0];

        // and darken walls that are no longer seen
        Object.keys(newView[1]).forEach(function (key) {
            wall = walls[key];
            if (wall) {
                setWallColor(wall, brightTweenColor, darkAmbient);
            }
        });
        oldRemoved = newView[1];

        // animate dark -> bright and vice versa
        new TWEEN.Tween(darkTweenColor).to(bright, 500)
            .onUpdate(scene.render).start();
        new TWEEN.Tween(brightTweenColor).to(dark, 500)
            .onUpdate(scene.render).start();

    }

    var levelDisplayMax = 0, levelDisplayMaxCeiling;

    // Set how many levels should be displayed. Only levels below
    // or equal to maxlvl will be drawn.
    function setLevelDisplayMax(maxlvl) {
        maxlvl = Math.min(Math.max(1, maxlvl), levelDisplayMaxCeiling);
        levelDisplayMax = maxlvl;
        Object.keys(levels).forEach(function (lvl) {
            var j = parseInt(lvl);
            levels[lvl].visible = j <= maxlvl;
        });
        team.sprites.forEach(function (sprite) {
            sprite.obj.visible =  sprite.position.z <= maxlvl;
        });
        scene.render();
    }

    function makeCursor(sides, size, color) {
        var material = new THREE.LineDashedMaterial(
            { color: color, linewidth: 3, dashSize: 10, gapSize: 10,
              transparent: false, opacity: 0.5});
        var geometry = new THREE.Geometry();

        var steps = sides, angle;
        for (var i = 0; i <= steps; i++) {
            angle = Math.PI/4 + 2 * Math.PI / steps * i;
            geometry.vertices.push(
                new THREE.Vector3( size * Math.cos(angle), size * Math.sin(angle), -.49 )
            );
        };
        var line = new THREE.Line( geometry, material, THREE.LineStrip );
        return line;
    }

    var cursor = makeCursor(4, 0.6, 0xFFFF00);


    // create a line connecting the given path
    function makePathMarker(path) {
        var material = new THREE.LineDashedMaterial(
            { color: 0xffff55, linewidth: 3, dashSize: 2, gapSize: 1 });
        var geometry = new THREE.Geometry();
        path.forEach(function (step) {
            var point = step;
            geometry.vertices.push(
                new THREE.Vector3(point[0], point[1], point[2]-0.49)
            );
        });
        var line = new THREE.Line( geometry, material, THREE.LineStrip );
        return line;
    }


    /* setup user input */

    function panCallback(dx, dy) {
        scene.nudge(new THREE.Vector3(dx, dy, 0));
    }

    function rotateCallback(angle) {
        scene.turn += angle;
    }

    function zoomCallback(amount) {
        scene.scale *= amount;
    }

    function turnCharacterCallback(angle) {
        // team.rotation += angle;
        // scene.render();
    }

    function levelDisplayCallback(delta) {
        // console.log("levelDisdsad", delta);
        setLevelDisplayMax(levelDisplayMax+delta);
    }

    var spriteCanvas, spriteRect;

    function selectVisible(x, y) {
        var targets = scene.pickObjects(x, y);
        // console.log("targets", targets);
        for (var i=0; i<targets.length; i++) {
            var parent = targets[i].object.parent;
            if (targets[i].object.name == "sprite") {
                // a sprite (i.e. a person)
                /* We take the texture image, blit it to a canvas (in
                   order to access pixel data), figure out the
                   intersection coordinates in local space and then
                   get the pixel under the mouse. Then we check the
                   alpha channel of that pixel to know if we're really
                   pointing at the sprite.
                */
                var localPoint = targets[i].object.worldToLocal(targets[i].point);
                var map = targets[i].object.material.map;
                var img = map.image;
                if (!spriteCanvas) {
                    // very primitive caching
                    spriteCanvas = document.createElement('canvas');
                    spriteCanvas.width = img.width;
                    spriteCanvas.height = img.height;
                    spriteCanvas.getContext('2d').drawImage(img, 0, 0);
                }
                var w = Math.round(img.width * map.repeat.x),
                    h = Math.round(img.height * map.repeat.y),
                    xoffs = img.width * map.offset.x,
                    yoffs = img.height * (.75 - map.offset.y),
                    x = Math.round(xoffs + w * (localPoint.x * 2 + 1) / 2),
                    y = Math.round(yoffs + h * (1 - (localPoint.y + 1) / 2));

                var alpha = spriteCanvas.getContext("2d").getImageData(x, y, 1, 1).data[3];
                var pos = parent.position.toArray();
                if (alpha > 0) {
                    return pos;  // yep, we're pointing at the sprite
                }
                // continue  // continue with anything behind
            } else if (targets[i].object.parent._key) {
                // it's a wall or floor
                var pos = key2point(targets[i].object.parent._key);
                var level = pos[2];
                // console.log(pos, level);
                if (levels[level].visible) {
                    //return targets[i].object.parent;
                    return pos;
                }
            }
        }
    }

    function runCallbacks (event, data) {
        if (R.has(event, callbacks)) {
            callbacks[event].forEach(function (cb) {cb(data);});
        }
    };

    var pathMarker;
    function clickCallback(x, y) {
        console.log("clickCallback", x, y);
        // first check if the mouse click actually hit anything on the map
        var pos = selectVisible(x, y);
        // console.log(pos);
        if (pos) {
            //var pos = key2point(target._key);
            var key = point2key(pos);
            var wall = walls[key]  //target._key];

            var member = team.isAnyoneAt(pos);
            if (member > -1) {
                console.log("user clicked member", member);
                runCallbacks("clickMember", member);
                return;
            }

            var enemy = enemyTeam.isAnyoneAt(pos);
            if (enemy > -1) {
                console.log("user clicked enemy", enemy);
                runCallbacks("clickEnemy", enemy);
                return;
            }

            // is it a valid position for the character (i.e. does it have a floor?)
            if (R.contains(5, wall._sides)) {
                console.log("clicked valid position", pos[0], pos[1], pos[2]);
                runCallbacks("clickPosition", pos);
            }
        }
    }

    // callback for mouse hovering.
    // We throttle it a bit because mouse movements can be fast.
    var _prevHoverPos;
    var hoverCallback = _.throttle(function (x, y) {
        var pos = selectVisible(x, y);
        if (pos) {
            //var pos = key2point(target._key);
            if (!R.eqDeep(pos, _prevHoverPos)) {
                console.log("changed pos", pos, _prevHoverPos);
                _prevHoverPos = pos;
                var key = point2key(pos);
                var wall = walls[key];  //target._key];
                if (wall && R.contains(5, wall._sides)) {
                    // console.log("hover valid position", pos[0], pos[1], pos[2]);
                    cursor.visible = true;
                    var member = team.isAnyoneAt(pos);
                    var enemy = enemyTeam.isAnyoneAt(pos);
                    clearPath();
                    if (member < 0 && enemy < 0)
                        runCallbacks("hoverPosition", pos);
                    else
                        // in case the callback is debounced we must cancel
                        callbacks["hoverPosition"].forEach(
                            function (cb) {cb.cancel && cb.cancel()});
                    cursor.position.set(pos[0], pos[1], pos[2]);
                    scene.render();
                } else {
                    cursor.visible = false;
                    clearPath();
                    callbacks["hoverPosition"].forEach(
                        function (cb) {cb.cancel && cb.cancel()});
                    scene.render();
                }
            }
        } else {
            cursor.visible = false;
            scene.render();
        }
    }, 100);

    var leaveCallback = function () {
        console.log("leave")
        cursor.visible = false;
        hoverCallback.cancel();  // must cancel since it's throttled and
                                 // we don't want it to be called after we left
        callbacks["hoverPosition"].forEach(    // likewise here, but debounced
            function (cb) {cb.cancel && cb.cancel()});
        markPath();
        scene.render();
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

    function clearPath() {
        if (pathMarker)
            scene.remove(pathMarker);
    }

    function markPath(path) {
        if (pathMarker) {
            scene.remove(pathMarker);
        }
        if (path) {
            pathMarker = makePathMarker(path);
            scene.add(pathMarker);
        }
        scene.render();
    }

    // move the character along a path, animating and updating the FOV as we go
    function moveTeamMember(team, j, path, fovDiffs, enemyDiffs, stepTime, showPath, callback) {
        console.log("moveTeamMember", j, path, fovDiffs, stepTime);
        var sprite = team.sprites[j];
        sprite.selected = false;
        //path = path.map(key2point);
        var directions = R.zipWith(getDirection, path, path.slice(1));
        var i = 0, fov;

        if (showPath) {
            markPath(path);
            var finalStep = path[path.length-1];
            cursor.visible = true;
            cursor.position.set(finalStep[0], finalStep[1], finalStep[2]);
        }

        takeStep(path[0], path[1], directions[0]);

        function takeStep (from, to, rot) {

            sprite.rotation = rot;
            if (fovDiffs) {
                updateFOVDiff(fovDiffs[i]);
            }

            if (enemyDiffs) {
                enemyDiffs[i][0].forEach(function (enemy) {
                    enemyTeam.update({members: [enemy]});
                    enemyTeam.showMember(enemy.name);
                });
                enemyDiffs[i][1].forEach(function (enemy) {
                    enemyTeam.hideMember(enemy.name);
                });
            }

            if (to[2]+1 != levelDisplayMax)
                setLevelDisplayMax(to[2]+1);

            // animate the movement with a poor man's walk cycle (2 frames)
            sprite.frame = i%2;

            // move the sprite along the path
            new TWEEN.Tween(sprite.position)
                .onUpdate(scene.render)
                .onComplete(
                    function () {
                        if (++i < path.length-1) {
                            takeStep(to, path[i+1], directions[i]);  // next step
                        } else {
                            // we're there!
                            scene.remove(pathMarker);
                            cursor.visible = false;
                            sprite.selected = true;
                            sprite.frame = 2;
                            callback && callback();
                        }
                    })
                .to({x: to[0], y: to[1], z: to[2]}, stepTime)
                .start();
        }
    }

    // create a line showing the given path
    function makeShot(pos1, pos2) {
        var material = new THREE.LineDashedMaterial(
            { color: 0xffffff, linewidth: 1, dashSize: 2, gapSize: 1 });
        var geometry = new THREE.Geometry();
        geometry.vertices.push(new THREE.Vector3(pos1[0], pos1[1], pos1[2]+0.5));
        geometry.vertices.push(new THREE.Vector3(pos2[0], pos2[1], pos2[2]+0.5));
        var line = new THREE.Line( geometry, material, THREE.LineStrip );
        return line;
    }

    function shotsFired(attacker, target, friendly) {

        var shot = makeShot(attacker.position, target.position);
        scene.add(shot);
        scene.render();
        setTimeout(function () {
            scene.remove(shot);
            scene.render();
            if (target.health <= 0) {
                if (friendly)
                    enemyTeam.markMemberDead(target.name);
                else
                    team.markMemberDead(target.name);
            }
        }, 1000);
    }

    function centerView(pos, animate) {
        if (animate) {
            new TWEEN.Tween(scene.table.position)
                .onUpdate(scene.render)
                .easing(TWEEN.Easing.Quadratic.InOut)
                .to({x: pos[0], y: pos[1], z: pos[2]}, 500).start();
        } else {
            scene.table.position.set(pos[0], pos[1], pos[2]);
        }
    }

    // utility function to limit the rate at which a function is called
    function throttle(fn, threshhold, scope) {
        threshhold || (threshhold = 250);
        var last,
            deferTimer;
        return function () {
            var context = scope || this;

            var now = +new Date,
                args = arguments;
            if (last && now < last + threshhold) {
                // hold on to it
                clearTimeout(deferTimer);
                deferTimer = setTimeout(function () {
                    last = now;
                    fn.apply(context, args);
                }, threshhold);
            } else {
                last = now;
                fn.apply(context, args);
            }
        };
    }

    var callbacks = {};  // store callbacks
    var graph;

    // main constructor
    function View (element, _graph) {
        scene = new Scene(element, 10, 60, 45);
        graph = _graph;

        cursor.visible = false;
        scene.add(cursor);

        Input.setupMouse(element, panCallback, rotateCallback,
                         zoomCallback, clickCallback, hoverCallback, leaveCallback);
        Input.setupKeyboard(turnCharacterCallback, rotateCallback, panCallback,
                            levelDisplayCallback);

        window.addEventListener("resize", function(event) {
            scene.reinit();
        });
    }

    /* public methods */

    View.prototype.addCallback = function (event, callback) {
        if (R.has(event, callbacks)) {
            callbacks[event].push(callback);
        } else {
            callbacks[event] = [callback];
        }
    };

    View.prototype.removeCallback = function (event, callback) {
        if (R.has(event, callbacks)) {
            callbacks[event] = R.difference(callbacks[event], [callback]);
        }
    };

    View.prototype.makeWorld = makeWorld;

    View.prototype.updateFOV = updateFOV;

    View.prototype.updateTeam = function (teamData) {
        if (team) {
            team.update(teamData);
        } else {
            team = new TeamView(teamData, scene.turn);
            scene.add(team.obj);

            // This is kinda fake; should dynamically create the enemy
            // team as they become visible.
            enemyTeam = new TeamView(
                {members: [{name: 0, position: [0, 0, 0], visible: false},
                           {name: 1, position: [0, 0, 0], visible: false}]},
                scene.turn, true);

            scene.add(enemyTeam.obj);
            scene.addCallback("turn", function (turn) {
                team.setTurn(turn);
                enemyTeam.setTurn(turn);
            });
        }
    };

    View.prototype.updateEnemyTeam = function (teamData) {
        enemyTeam.update(teamData);
    };

    View.prototype.selectTeamMember = function (i) {
        team.select(i);

        // this is a bit ugly...
        var sprite = team.sprites[i];
        setLevelDisplayMax(sprite.position.z+1);

        scene.render();
    };

    View.prototype.moveTeamMember = function (n, path, fovs, enemies, t, cb) {
        moveTeamMember(team, n, path, fovs, enemies, t, true, cb);
    };

    View.prototype.moveEnemyMember = function (n, path, fovs, enemies, t, cb, hide) {
        var p = path[0];
        enemyTeam.findMemberSprite(n).position.set(p[0], p[1], p[2]);
        enemyTeam.showMember(n);
        function callback() {
            cb();
            if (hide)
                enemyTeam.hideMember(n);
        };
        moveTeamMember(enemyTeam, n, path, fovs, enemies, t, false, callback);
    };

    View.prototype.hideMember = function (name) {team.hideMember(name)};

    View.prototype.getSelectedTeamMember = function () {return team.selected;};

    View.prototype.shotsFired = shotsFired;

    View.prototype.increaseLevelDisplayMax = function () {setLevelDisplayMax(levelDisplayMax+1);};
    View.prototype.decreaseLevelDisplayMax = function () {setLevelDisplayMax(levelDisplayMax-1);};

    View.prototype.centerView = centerView;

    View.prototype.showPath = markPath;

    return View;

})();
