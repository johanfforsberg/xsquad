from itertools import tee, izip
from collections import defaultdict
from random import randint


# def get_neighbors(pos, level):
#     x, y = pos
#     neighbors = []
#     for (dx, dy), dist in (((-1, -1), 3), ((0, -1), 2), ((1, -1), 3),
#                            ((-1, 0), 2),                ((1, 0), 2),
#                            ((-1, 1), 3),  ((0, 1), 2),  ((1, 1), 3)):
#         dpos = (x + dx, y + dy)
#         if dpos not in level.objects:
#             neighbors.append((dpos, dist))
#     return neighbors


# def get_distances(level, start, max_steps):
#     """produces a map of positions and how many steps it takes to reach them.
#     """
#     queue = OrderedDict({start: 0})
#     step = 0
#     i = 0
#     while i < len(queue) and step <= max_steps + 1:
#         pos, step = queue.items()[i]
#         for neigh, dist in get_neighbors(pos, level):
#             old = queue.get(neigh)
#             if old is None or old > step + dist:
#                 queue[neigh] = step + dist
#         i += 1
#     return queue


def pairwise(iterable):
    "s -> (s0,s1), (s1,s2), (s2, s3), ..."
    a, b = tee(iterable)
    next(b, None)
    return izip(a, b)


# def find_path(level, start, end, max_steps):
#     """Find the/a shortest path from start to end."""
#     step = 0
#     queue = OrderedDict({end: step})
#     i = 0
#     while i < len(queue) and step <= max_steps + 1:
#         pos, step = queue.items()[i]
#         if pos == start:  # we're there
#             path = []
#             pos = start
#             nearest = queue[start]
#             while pos != end:
#                 for neigh, ndist in get_neighbors(pos, level):
#                     print "neigh", neigh, "ndist", ndist
#                     dist = queue.get(neigh)
#                     if neigh == end or (dist and dist < nearest):
#                         nearest = dist
#                         pos = neigh
#                         dist_delta = ndist
#                 path.append((pos, dist_delta))
#             return path
#         for neigh, dist in get_neighbors(pos, level):
#             old = queue.get(neigh)
#             totdist = step + dist
#             if totdist <= max_steps and (old is None or old > totdist):
#                 queue[neigh] = totdist
#         i += 1
#     return None


class Person(object):
    def __init__(self, name=None, maxhealth=100,
                 position=None, rotation=0, speed=100, moves=100,
                 vision=8):
        self.name = name
        self.maxhealth = maxhealth
        self.health = maxhealth
        self.position = position
        self.rotation = rotation
        self.speed = speed
        self.moves = moves
        self.vision = vision
        self.enemies_seen = []
        print self.name, "speed", self.speed

    def reset(self):
        self.moves = self.speed

    def find_path(self, level, pos):
        path = find_path(level, self.position, pos, self.moves)
        return path

    def possible_moves(self, level):
        return get_distances(level, self.position, self.moves)

    def move(self, level, pos):
        #neighbors = get_neighbors(self.position, level)
        #print pos, dict(neighbors).keys()
        cost = level.check_move(self.position, pos)
        if cost:
            if self.moves > 0:
                self.position = pos
                self.moves -= cost
                return True
        return False

    def check_path(self, level, path):
        costs = [level.check_move(a, b) for a, b in pairwise(path)]
        if all(costs):
            return costs
        return False

    def _get_viewpoint(self):
        return (self.position[0], self.position[1], self.position[2] + 1)

    def field_of_view(self, level):
        return level.field_of_view(self._get_viewpoint(), self.vision)

    def dbdict(self):
        return dict(name=self.name, health=self.health,
                    maxhealth=self.maxhealth, position=self.position,
                    rotation=self.rotation, speed=self.speed,
                    moves=self.moves, vision=self.vision)

    @property
    def dead(self):
        return self.health <= 0

    @classmethod
    def create(cls, dbdict):
        pos = dbdict["position"]
        dbdict["position"] = tuple(pos) if pos else None
        return cls(**dbdict)


class Team(object):

    names = ["Jonlan", "Anderson", "Stone", "Harris", "Turner"]

    def __init__(self, player, members=None, size=2, area=((0, 10), (0, 10), (0, 10))):
        self.player = player
        self.members = members or self._randomize_members(size, area)
        self.mapped = {}
        self.spotted = defaultdict(set)

    def _randomize_members(self, n, area):
        taken = set([None])
        members = []
        for i in range(n):
            position = None
            while position in taken:
                taken.add(position)
                position = randint(*area[0]), randint(*area[1]), randint(*area[2])
            member = Person(name=str(i), position=position, rotation=randint(0, 7)*45)
            members.append(member)
        return members

    @classmethod
    def create(cls, dbd):
        people = [Person.create(p) for p in dbd["people"]]
        return cls(dbd["player"], people)

    def __getitem__(self, pos):
        for person in self.members:
            if person.position == pos:
                return person
        return None

    def enemies_seen(self):
        enemies = set()
        for p in self.members:
            enemies.update(p.enemies_seen)
        return sorted(enemies)

    def reset(self):
        for person in self.members:
            person.reset()

    def dbdict(self):
        return dict(player=self.player,
                    members=[p.dbdict() for p in self.members])
