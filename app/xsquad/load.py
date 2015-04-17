from los import point2key


def load_level(levelfile):

    level = []
    textures = {}
    with open(levelfile) as f:
        # first read the texture offsets
        for line in (l.strip() for l in f):
            if len(line) == 0:
                break
            character, offset = line.split("=")
            textures[character] = offset
        a = []
        level.append(a)
        for line in (l.strip() for l in f):
            if len(line) > 0:
                a.append(line)
            else:
                a = []
                level.append(a)

    xmax = len(level[0][0]) // 2
    ymax = len(level[0]) // 2
    zmax = len(level) // 2

    # level = "".join(level_lines)

    walls = {}

    for z in range(zmax):
        for y in range(ymax):
            for x in range(xmax):
                # print(x, y, z)
                center = level[z*2+1][y*2+1][x*2+1]

                north = level[z*2+1][y*2][x*2+1]
                west = level[z*2+1][y*2+1][x*2]
                south = level[z*2+1][y*2+2][x*2+1]
                east = level[z*2+1][y*2+1][x*2+2]
                top = level[z*2+2][y*2+1][x*2+1]
                bottom = level[z*2][y*2+1][x*2+1]

                if center == "0" or all([north != ".", west != ".", south != ".", east != ".", top != "."]):
                    result = "000000"
                else:
                    result = west + east + north + south + top + bottom
                if result != "......":
                    walls[point2key((x, y, z))] = result

    return walls, textures
