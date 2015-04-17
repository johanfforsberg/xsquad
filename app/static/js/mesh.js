var Mesh = function () {

    this.sides = [];
    for (var i = 0; i < 6; i++) {
        this.sides[i] = make_side(i, 1);
    }

    this.side = function (s, offset) {
        var tmp = make_side(s, 1);
        var result = {vertices: [], normals: []};
        tmp.vertices.forEach(function (v) {
            var f = 1.5;
            result.vertices.push(v[0] + offset[0]*f, v[1] + offset[1]*f, v[2] + offset[2]*f);
        });
        tmp.normals.forEach(function (n) {
            result.normals.push(n[0], n[1], n[2]);
        });
        return result;
    };

    this.makeSide = function(side, scale) {

        var vertices, normals, texture;
        var l = scale / 2;
        var o = 0, face, normal;
        var geometry = new THREE.Geometry();
        if (side == 0) {
            geometry.vertices.push(
                new THREE.Vector3(-l, -l, -l),
                new THREE.Vector3(-l, l, -l),
                new THREE.Vector3(-l, l, l),
                new THREE.Vector3(-l, -l, l)
            );
            normal = new THREE.Vector3(1, 0, 0);  // this should be the other way!
            geometry.faces.push(
                new THREE.Face3(0, 1, 2, normal), new THREE.Face3(2, 3, 0, normal)
            );
            geometry.faceVertexUvs[0].push(
                [new THREE.Vector2(0, 0), new THREE.Vector2(1, 0), new THREE.Vector2(1, 1)],
                [new THREE.Vector2(1, 1), new THREE.Vector2(0, 1), new THREE.Vector2(0, 0)]
            );
            return geometry;
        }
        if (side == 1) {
            geometry.vertices.push(
                new THREE.Vector3(l, l, -l),
                new THREE.Vector3(l, -l, -l),
                new THREE.Vector3(l, -l, l),
                new THREE.Vector3(l, l, l)
            );
            normal = new THREE.Vector3(-1, 0, 0);
            geometry.faces.push(
                new THREE.Face3(0, 1, 2, normal), new THREE.Face3(2, 3, 0, normal)
            );
            geometry.faceVertexUvs[0].push(
                [new THREE.Vector2(0, 0), new THREE.Vector2(1, 0), new THREE.Vector2(1, 1)],
                [new THREE.Vector2(1, 1), new THREE.Vector2(0, 1), new THREE.Vector2(0, 0)]
            );
            return geometry;
        }
        if (side == 2) {
            geometry.vertices.push(
                new THREE.Vector3(l, -l, -l),
                new THREE.Vector3(-l, -l, -l),
                new THREE.Vector3(-l, -l, l),
                new THREE.Vector3(l, -l, l)
            );
            normal = new THREE.Vector3(0, 1, 0);
            geometry.faces.push(
                new THREE.Face3(0, 1, 2, normal), new THREE.Face3(2, 3, 0, normal)
            );
            geometry.faceVertexUvs[0].push(
                [new THREE.Vector2(0, 0), new THREE.Vector2(1, 0), new THREE.Vector2(1, 1)],
                [new THREE.Vector2(1, 1), new THREE.Vector2(0, 1), new THREE.Vector2(0, 0)]
            );
            return geometry;
        }
        if (side == 3) {

            geometry.vertices.push(
                new THREE.Vector3(-l, l, -l),
                new THREE.Vector3(l, l, -l),
                new THREE.Vector3(l, l, l),
                new THREE.Vector3(-l, l, l)
            );
            normal = new THREE.Vector3(0, -1, 0);
            geometry.faces.push(
                new THREE.Face3(0, 1, 2, normal), new THREE.Face3(2, 3, 0, normal)
            );
            geometry.faceVertexUvs[0].push(
                [new THREE.Vector2(0, 0), new THREE.Vector2(1, 0), new THREE.Vector2(1, 1)],
                [new THREE.Vector2(1, 1), new THREE.Vector2(0, 1), new THREE.Vector2(0, 0)]
            );
            return geometry;
        }
        if (side == 5) {
            geometry.vertices.push(
                new THREE.Vector3(-l, -l, -l),
                new THREE.Vector3(l, -l, -l),
                new THREE.Vector3(l, l, -l),
                new THREE.Vector3(-l, l, -l)
            );
            normal = new THREE.Vector3(0, 0, 1);
            geometry.faces.push(
                new THREE.Face3(0, 1, 2, normal), new THREE.Face3(2, 3, 0, normal)
            );
            geometry.faceVertexUvs[0].push(
                [new THREE.Vector2(0, 0), new THREE.Vector2(1, 0), new THREE.Vector2(1, 1)],
                [new THREE.Vector2(1, 1), new THREE.Vector2(0, 1), new THREE.Vector2(0, 0)]
            );
            return geometry;
        }

    };


    function make_side(side, scale) {
        var vertices, normals, texture;
        var l = scale / 2;
        if (side === 0) {
            vertices = [
                [l, -l, -l],   [l, l, -l],   [l, 0, 0],
                [l, l, -l],    [l, l, l],    [l, 0, 0],
                [l, l, l],     [l, -l, l],   [l, 0, 0],
                [l, -l, l],    [l, -l, -l],  [l, 0, 0]
            ];
            normals = [[1, 0, 0], [1, 0, 0], [1, 0, 0],
                       [1, 0, 0], [1, 0, 0], [1, 0, 0],
                       [1, 0, 0], [1, 0, 0], [1, 0, 0],
                       [1, 0, 0], [1, 0, 0], [1, 0, 0]];
        } else if (side === 1) {
            vertices = [
                [-l, -l, -l],   [-l, 0, 0],   [-l, l, -l],
                [-l, l, -l],    [-l, 0, 0],   [-l, l, l],
                [-l, l, l],     [-l, 0, 0],   [-l, -l, l],
                [-l, -l, l],    [-l, 0, 0],   [-l, -l, -l]
            ];
            normals = [[-1, 0, 0], [-1, 0, 0], [-1, 0, 0],
                       [-1, 0, 0], [-1, 0, 0], [-1, 0, 0],
                       [-1, 0, 0], [-1, 0, 0], [-1, 0, 0],
                       [-1, 0, 0], [-1, 0, 0], [-1, 0, 0]];
        } else if (side === 2) {
            vertices = [
                [-l, l, -l], [0, l, 0],    [l, l, -l],
                [l, l, -l],   [0, l, 0],  [l, l, l],
                [l, l, l],    [0, l, 0],   [-l, l, l],
                [-l, l, l],   [0, l, 0],   [-l, l, -l]
            ];
            normals = [[0, 1, 0], [0, 1, 0], [0, 1, 0],
                       [0, 1, 0], [0, 1, 0], [0, 1, 0],
                       [0, 1, 0], [0, 1, 0], [0, 1, 0],
                       [0, 1, 0], [0, 1, 0], [0, 1, 0]];
        } else if (side === 3) {
            vertices = [
                [-l, -l, -l],   [l, -l, -l],    [0, -l, 0],
                [l, -l, -l],    [l, -l, l],    [0, -l, 0],
                [l, -l, l],     [-l, -l, l],   [0, -l, 0],
                [-l, -l, l],    [-l, -l, -l],  [0, -l, 0]
            ];
            normals = [[0, -1, 0], [0, -1, 0], [0, -1, 0],
                       [0, -1, 0], [0, -1, 0], [0, -1, 0],
                       [0, -1, 0], [0, -1, 0], [0, -1, 0],
                       [0, -1, 0], [0, -1, 0], [0, -1, 0]];
        } else if (side === 4) {
            vertices = [
                [-l, -l, l],   [l, -l, l],   [0, 0, l],
                [l, -l, l],    [l, l, l],    [0, 0, l],
                [l, l, l],     [-l, l, l],   [0, 0, l],
                [-l, l, l],    [-l, -l, l],  [0, 0, l]
            ];
            normals = [[0, 0, 1], [0, 0, 1], [0, 0, 1],
                       [0, 0, 1], [0, 0, 1], [0, 0, 1],
                       [0, 0, 1], [0, 0, 1], [0, 0, 1],
                       [0, 0, 1], [0, 0, 1], [0, 0, 1]];
        } else if (side === 5) {
            vertices = [
                [-l, -l, -l],   [0, 0, -l],   [l, -l, -l],
                [l, -l, -l],    [0, 0, -l],   [l, l, -l],
                [l, l, -l],     [0, 0, -l],   [-l, l, -l],
                [-l, l, -l],    [0, 0, -l],   [-l, -l, -l]
            ];
            normals = [[0, 0, -1], [0, 0, -1], [0, 0, -1],
                       [0, 0, -1], [0, 0, -1], [0, 0, -1],
                       [0, 0, -1], [0, 0, -1], [0, 0, -1],
                       [0, 0, -1], [0, 0, -1], [0, 0, -1]];
        }

        texture = [[[0, 0], [1, 0], [0.5, 0.5]],
                   [[1, 0], [1, 1], [0.5, 0.5]],
                   [[1, 1], [0, 1], [0.5, 0.5]],
                   [[0, 1], [0, 0], [0.5, 0.5]]];

        return {vertices: vertices, normals: normals, texture: texture};
    };


};
