from operator import itemgetter
from Queue import PriorityQueue
from math import sqrt

from los import key2point, point2key


# stolen from los.pyx... should not be duplicated

EMPTY1 = "."
EMPTY = EMPTY1 * 6

def west(p):
    return p[0] != EMPTY1

def east(p):
    return p[1] != EMPTY1

def south(p):
    return p[2] != EMPTY1

def north(p):
    return p[3] != EMPTY1

def up(p):
    return p[4] != EMPTY1

def down(p):
    return p[5] != EMPTY1


def position_delta(key1, key2):
    a = key2point(key1)
    b = key2point(key2)
    return (b[0] - a[0], b[1] - a[1], b[2] - a[2])


def get_neighbor_key(key, dx=0, dy=0, dz=0):
    x, y, z = key2point(key)
    return point2key((x+dx, y+dy, z+dz))


def is_passable(sides, dx, dy):
    print sides
    if dx == -1:
        if west(sides):
            return False
        if dy == -1:
            return not south(sides)
        if dy == 1:
            return not north(sides)
        return True
    if dx == 1:
        if east(sides):
            return False
        if dy == -1:
            return not south(sides)
        if dy == 1:
            return not north(sides)
        return True
    if dy == -1:
        return not south(sides)
    if dy == 1:
        return not north(sides)


def get_neighbors(key, world):
    """
    This is where we figure out which of the neighboring positions
    can be moved to. We count directions in the horizontal plane,
    up/down is treated as special cases.

    A wall in one direction means that we also can't move to the
    diagonals touching that direction.  This means it's not
    allowed to cut corners or move diagonally through doors.
    (It also simplifies the calculation a lot :)
    """
    sides = world[key]
    neighbors = []
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            if dx != 0 or dy != 0:
                neigh_key = get_neighbor_key(key, dx, dy)
                neigh_sides = world.get(neigh_key, EMPTY)
                # TODO: check if block is within level borders
                if (is_passable(sides, dx, dy) and
                        is_passable(neigh_sides, -dx, -dy)):
                    if down(neigh_sides):
                        neighbors.append(
                            {"key": neigh_key,
                             "cost": 3 if abs(dx) == abs(dy) else 2})
                    else:
                        below = get_neighbor_key(neigh_key, 0, 0, -1)
                        if below in world and down(world[below]):
                            neighbors.append({"key": below, "cost": 5})
                elif abs(dx) != abs(dy):
                    above_neigh = get_neighbor_key(neigh_key, 0, 0, 1)
                    above = get_neighbor_key(key, 0, 0, 1)
                    if above_neigh in world and down(world[above_neigh]) and is_passable(world.get(above, EMPTY), dx, dy):
                        neighbors.append({"key": above_neigh, "cost": 7})
    return sorted(neighbors, key=itemgetter("cost"))


def make_path_graph(world):
    connections = {}
    for key in world:
        neighbors = get_neighbors(key, world)
        if neighbors:
            connections[key] = neighbors
    return connections


# A* path finding (not really used yet, untested)

def heuristic(key1, key2, weight=5):
    x1, y1, z1 = key2point(key1)
    x2, y2, z2 = key2point(key2)
    return weight * sqrt((x2-x1)**2 + (y2-y2)**2 + (z2-z1)**2)


def find_path(startkey, goalkey, world):

    frontier = PriorityQueue()
    frontier.put({"key": startkey, "cost": 0}, 0)
    came_from = {startkey: None}
    cost_so_far = {startkey: 0}
    step = 0

    while not frontier.empty() and step < 100000:
        step += 1  # just safety
        current = frontier.get()
        if current["key"] == goalkey:
            break

        for neighbor in get_neighbors(current["key"], world):
            new_cost = cost_so_far[current["key"]] + neighbor["cost"]
            if new_cost < cost_so_far.get(neighbor["key"], 10000000):
                cost_so_far[neighbor["key"]] = new_cost
                neighbor["cost"] += heuristic(neighbor["key"], goalkey)
                frontier.put(neighbor)
                came_from[neighbor["key"]] = current["key"]

    if current["key"] != goalkey:
        return None

    key = goalkey
    path = []
    step = 0
    while key and step < 1000:
        key = came_from[key]
        path.insert(0, key)
    return path
