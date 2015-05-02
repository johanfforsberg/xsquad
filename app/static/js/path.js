PathGraph = (function () {

    function _Path(graph) {
        this.graph = graph;
    }

    /* Note: all the helper functions are not used anymore since
     we now get the pathfindig graph from the server.
     Kept for sentimental reasons. */

    function positionDelta(key1, key2) {
        var a = key2point(key1), b = key2point(key2);
        return {dx: b[0] - a[0], dy: b[1] - a[1], dz: b[2] - a[2]};

    }

    function getNeighborKey(key, dx, dy, dz) {
        var z =  key >> 16;
        var y = (key >> 8) - z * 256;
        var x = key - y*256 - z*256*256;
        return x + dx + ((y + dy) << 8) + ((z + dz) << 16);
    }


    function isPassable(sides, dx, dy) {
        if (!sides)
            return true;
        if (dx == -1) {
            if (sides[0] != ".")
                return false;
            if (dy == -1) return (sides[2] == ".");
            if (dy == 1) return (sides[3] == ".");
            return true;
        }
        if (dx == 1) {
            if (dy == -1) return (sides[2] == ".");
            if (dy == 1) return (sides[3] == ".");
            return sides[1] == ".";
        }
        if (dy == -1) {
            return sides[2] == ".";
        }
        if (dy == 1)
            return sides[3] == ".";
    }

    function getNeighbors(key, world, from) {
        /*
         This is where we figure out which of the neighboring positions
         can be moved to. We count directions in the horizontal plane,
         up/down is treated as special cases.

         A wall in one direction means that we also can't move to the
         diagonals touching that direction.  This means it's not
         allowed to cut corners or move diagonally through doors.
         (It also simplifies the calculation a lot :)
         */
        var sides = world[key], neighborKey, neighbors = [];
        for (var dx = -1; dx <= 1; dx += 1) {
            for (var dy = -1; dy <= 1; dy += 1) {
                neighborKey = getNeighborKey(key, dx, dy, 0);
                if (!(dx === 0 && dy === 0)) {
                    if (isPassable(world[key], dx, dy) && isPassable(world[neighborKey], -dx, -dy)) {
                        if ((world[neighborKey] >> 10) & 1) {  // is there a floor here?
                            neighbors.push({key: neighborKey,
                                            cost: Math.abs(dx) === Math.abs(dy)? 3 : 2});
                        } else  {
                            // no floor! well, is there something below?
                            // max fall height is 1 unit
                            var below = getNeighborKey(neighborKey, 0, 0, -1);
                            if (R.has(below, world) && (world[below] >> 10) & 1) {
                                console.log("below", key2point(below));
                                neighbors.push({key: below, cost: 5});
                            }
                        }
                    } else if (Math.abs(dx) !== Math.abs(dy)) {
                        // wall eh? Let's check if it can be scaled
                        // maximum climb is 1 unit
                        var above = getNeighborKey(key, dx, dy, 1);
                        if (R.has(above, world) && (world[above] >> 10) & 1) {
                            console.log("above", key2point(above));
                            neighbors.push({key: above, cost: 7});
                        }
                    }
                }
            }
        }
        return neighbors;
    }

    function heuristic(key1, key2) {
        // Manhattan distance on a square grid
        var p1 = key2point(key1), p2 = key2point(key2);
        return 2 * Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2) + Math.pow(p1[2] - p2[2], 2));
    }

    function findPath (start, goal) {

        console.log("findPath", key2point(start), key2point(goal));

        var frontier = new PriorityQueue(
            {comparator: function (a, b) {return a.cost - b.cost;}});
        frontier.queue({key: start, cost: 0});
        var cameFrom = {};
        cameFrom[start] = -1;
        var costSoFar = {};
        costSoFar[start] = 0;
        var current, last, neighbors, totalCost;
        var step = 0;

        while (frontier.length > 0 && step++ < 1000000) {
            current = frontier.dequeue();
            if (current.key == goal) {
                totalCost = costSoFar[current.key];
                break;
            }
            neighbors = this.graph[current.key];

            var newCost, next;
            neighbors.forEach(function (next, i) {
                newCost = costSoFar[current.key] + next.cost;
                if (!R.has(next.key, costSoFar) || (newCost < costSoFar[next.key])) {
                    costSoFar[next.key] = newCost;
                    frontier.queue({key: next.key,
                                    cost: next.cost + heuristic(next.key, goal)});
                    cameFrom[next.key] = current.key;
                }
            });
            last = current;
        }

        // check if we were able to find a suitable path
        if (current.key != goal) {
            return;
        }

        current = goal;
        var path = [current];
        step = 0;
        while (current != -1 && step++ < 10000) {
            current = cameFrom[current];
            path.unshift(current);
        }

        if (path.length > 0 && totalCost)
            return {points: path.slice(1), cost: totalCost};
    }

    function makePathGraph (world) {
        var connections = {};
        Object.keys(world).forEach(function (key) {
            var neighbors = getNeighbors(key, world);
            console.log("neighbors", key, neighbors);
            if (neighbors.length > 0)
                connections[key] = neighbors;
        });
        console.log("pathGrapoh", connections);
        return connections;
    }

    _Path.prototype.findPath = R.memoize(findPath);

    //return {findPath: findPath, makePathGraph: makePathGraph};
    return _Path;

})();
