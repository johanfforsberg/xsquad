import pyximport
pyximport.install()
from los import point2key, key2point, world_visibility, line_of_sight_3d
from load import load_level
from path import make_path_graph


class Level(object):

    #sectors = calculate_sectors(20)

    def __init__(self, size, walls=None, walltypes=None):
        xsize, ysize, zsize = size
        if not 0 < xsize <= 256 or not 0 < ysize <= 256 or not 0 < zsize <= 256:
            raise ValueError("Level can't be more than 256 units in any direction.")

        self.size = size

        self.walls = walls
        self.walltypes = walltypes
        self.items = {}
        self.graph = make_path_graph(walls)

    def __getitem__(self, pos):
        return self.content.get(pos)

    def __setitem__(self, pos):
        pass

    def load_ascii(self, filename):
        self.content = load_level(filename)

    def check_move(self, pos1, pos2):
        key1 = point2key(tuple(pos1))
        if key1 not in self.graph:
            return False
        key2 = point2key(tuple(pos2))
        if key2 not in self.graph:
            return False
        for neighbor in self.graph[key1]:
            if neighbor["key"] == key2:
                return neighbor["cost"]
        return False
        #return key2 in [neighbor["key"] for neighbor in self.graph[key1]]

    def check_visibility(self, pos1, pos2):
        x1, y1, z1 = pos1
        x2, y2, z2 = pos2
        return line_of_sight_3d(x1, y1, z1, x2, y2, z2, self.walls)

    def field_of_view(self, pov, radius):
        fov = world_visibility(self.walls, tuple(pov), radius)  # the walls currently visible from pov
        return fov, dict((key, items) for key, items in self.items if key in fov)

    def dbdict(self):
        return dict(size=self.size, walls=self.walls, items=self.items, walltypes=self.walltypes,
                    graph=self.graph)

    @classmethod
    def create(cls, dbdict):
        level = cls(dbdict["xsize"], dbdict["ysize"], dbdict["zsize"])
        level.walls = dbdict["walls"]
        level.items = dbdict["items"]
        return level
