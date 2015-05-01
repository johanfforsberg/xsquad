# import numpy as np
# cimport numpy as np

# #from libc.math cimport abs
cdef extern from "math.h":
    double sqrt(double x)

# from libc.math cimport round


cpdef tuple key2point(int key):
    cdef unsigned char x, y, z
    z =  key >> 16
    y = (key >> 8) - z * 256
    x = key - y*256 - z*256*256
    return (x, y, z)


cpdef int point2key(tuple point):
    return point[0] + (point[1] << 8) + (point[2] << 16)


cpdef int xyz2key(int x, int y, int z):
    return x + (y << 8) + (z << 16)


cpdef world_visibility(dict world, tuple observer, int horizon):
    cdef unsigned char x0, y0, z0
    x0, y0, z0 = observer
    horizon = horizon**2
    cdef unsigned int stop, d
    #cdef unsigned char vis
    result = {}
    for item in world:
        x1, y1, z1 = key2point(item)
        d = (x1-x0)**2 + (y1-y0)**2 + (z1-z0)**2
        if d == 0:
            result[item] = world[item]
        elif d <= horizon:
            a = line_of_sight_3d(x0, y0, z0, x1, y1, z1, world)
            b = line_of_sight_3d(x1, y1, z1, x0, y0, z0, world)
            # need to check both directions to make it symmetric
            if a and b:  # "or" here?
                result[item] = world[item]
    return result


EMPTY1 = "."
EMPTY = EMPTY1 * 6

cdef unsigned char west(bytes p):
    return p[0] != EMPTY1

cdef unsigned char east(bytes p):
    return p[1] != EMPTY1

cdef unsigned char south(bytes p):
    return p[2] != EMPTY1

cdef unsigned char north(bytes p):
    return p[3] != EMPTY1

cdef unsigned char up(bytes p):
    return p[4] != EMPTY1

cdef unsigned char down(bytes p):
    return p[5] != EMPTY1


cdef unsigned char check_passage(int x1, int y1, int z1, int x2, int y2, int z2, dict world):

    "Check whether it is possible to move from a position to an adjacent one in the world."

    cdef int p1, p2, passages = 0

    if x1 == x2 and y1 == y2 and z1 == z2:  # trivial case
        return True

    p1 = xyz2key(x1, y1, z1)
    p2 = xyz2key(x2, y2, z2)
    if p1 not in world and p2 not in world:
        return True
    w1 = world.get(p1, EMPTY)
    w2 = world.get(p2, EMPTY)


    # lower corners

    cdef bytes e, w, s, n, u, d

    if x1 > x2 and y1 > y2 and z1 > z2:  # wsd
        w = world.get(xyz2key(x1-1, y1, z1), EMPTY)
        s = world.get(xyz2key(x1, y1-1, z1), EMPTY)
        d = world.get(xyz2key(x1, y1, z1-1), EMPTY)
        return ((west(w1) + (south(w) + up(w2)) * (down(w) + north(w2))) *
                (south(w1) + (west(s) + up(w2)) * (down(s) + east(w2))) *
                (down(w1) + (south(d) + east(w2)) * (west(d) + north(w2)))) == 0

    if x1 < x2 and y1 > y2 and z1 > z2:  # esd
        e = world.get(xyz2key(x1+1, y1, z1), EMPTY)
        s = world.get(xyz2key(x1, y1-1, z1), EMPTY)
        d = world.get(xyz2key(x1, y1, z1-1), EMPTY)
        return ((east(w1) + (south(e) + up(w2)) * (down(e) + north(w2))) *
                (south(w1) + (east(s) + up(w2)) * (down(s) + west(w2))) *
                (down(w1) + (south(d) + west(w2)) * (east(d) + north(w2)))) == 0

    if x1 > x2 and y1 < y2 and z1 > z2:  # wnd
        w = world.get(xyz2key(x1-1, y1, z1), EMPTY)
        n = world.get(xyz2key(x1, y1+1, z1), EMPTY)
        d = world.get(xyz2key(x1, y1, z1-1), EMPTY)
        return ((west(w1) + (north(w) + up(w2)) * (down(w) + south(w2))) *
                (north(w1) + (west(n) + up(w2)) * (down(n) + east(w2))) *
                (down(w1) + (north(d) + east(w2)) * (west(d) + south(w2)))) == 0

    if x1 < x2 and y1 < y2 and z1 > z2:  # end
        e = world.get(xyz2key(x1+1, y1, z1), EMPTY)
        n = world.get(xyz2key(x1, y1+1, z1), EMPTY)
        d = world.get(xyz2key(x1, y1, z1-1), EMPTY)
        return ((east(w1) + (north(e) + up(w2)) * (down(e) + south(w2))) *
                (north(w1) + (east(n) + up(w2)) * (down(n) + west(w2))) *
                (down(w1) + (north(d) + west(w2)) * (east(d) + south(w2)))) == 0

    # upper corners

    if x1 > x2 and y1 > y2 and z1 < z2:  # wsu
        w = world.get(xyz2key(x1-1, y1, z1), EMPTY)
        s = world.get(xyz2key(x1, y1-1, z1), EMPTY)
        u = world.get(xyz2key(x1, y1, z1+1), EMPTY)
        return ((west(w1) + (south(w) + down(w2)) * (up(w) + north(w2))) *
                (south(w1) + (west(s) + down(w2)) * (up(s) + east(w2))) *
                (up(w1) + (south(u) + east(w2)) * (west(u) + north(w2)))) == 0

    if x1 < x2 and y1 > y2 and z1 < z2:  # esu
        e = world.get(xyz2key(x1+1, y1, z1), EMPTY)
        s = world.get(xyz2key(x1, y1-1, z1), EMPTY)
        u = world.get(xyz2key(x1, y1, z1+1), EMPTY)
        return ((east(w1) + (south(e) + down(w2)) * (up(e) + north(w2))) *
                (south(w1) + (east(s) + down(w2)) * (up(s) + west(w2))) *
                (up(w1) + (south(u) + west(w2)) * (east(u) + north(w2)))) == 0

    if x1 > x2 and y1 < y2 and z1 < z2:  # wnu
        w = world.get(xyz2key(x1-1, y1, z1), EMPTY)
        n = world.get(xyz2key(x1, y1+1, z1), EMPTY)
        u = world.get(xyz2key(x1, y1, z1+1), EMPTY)
        return ((west(w1) + (north(w) + down(w2)) * (up(w) + south(w2))) *
                (north(w1) + (west(n) + down(w2)) * (up(n) + east(w2))) *
                (up(w1) + (north(u) + east(w2)) * (west(u) + south(w2)))) == 0

    if x1 < x2 and y1 < y2 and z1 < z2:  # enu
        e = world.get(xyz2key(x1+1, y1, z1), EMPTY)
        n = world.get(xyz2key(x1, y1+1, z1), EMPTY)
        u = world.get(xyz2key(x1, y1, z1+1), EMPTY)
        return ((east(w1) + (north(e) + down(w2)) * (up(e) + south(w2))) *
                (north(w1) + (east(n) + down(w2)) * (up(n) + west(w2))) *
                (up(w1) + (north(u) + west(w2)) * (east(u) + south(w2)))) == 0

    # OK, now diagonals...

    if x1 > x2 and y1 > y2:  # ws
        return (west(w1) + north(w2)) * (south(w1) + east(w2)) == 0

    if x1 < x2 and y1 > y2:  # es
        return (east(w1) + north(w2)) * (south(w1) + west(w2)) == 0

    if x1 > x2 and y1 < y2:  # wn
        return (west(w1) + south(w2)) * (north(w1) + east(w2)) == 0

    if x1 < x2 and y1 < y2:  # en
        return (east(w1) + south(w2)) * (north(w1) + west(w2)) == 0


    if x1 > x2 and z1 > z2:  # wd
        return (west(w1) + up(w2)) * (down(w1) + east(w2)) == 0

    if x1 < x2 and z1 > z2:  # ed
        return (east(w1) + up(w2)) * (down(w1) + west(w2)) == 0

    if x1 > x2 and z1 < z2:  # wu
        return (west(w1) + down(w2)) * (up(w1) + east(w2)) == 0

    if x1 < x2 and z1 < z2:  # eu
        return (east(w1) + down(w2)) * (up(w1) + west(w2)) == 0


    if y1 > y2 and z1 > z2:  # sd
        return (south(w1) + up(w2)) * (down(w1) + north(w2)) == 0

    if y1 < y2 and z1 > z2:  # nd
        return (north(w1) + up(w2)) * (down(w1) + south(w2)) == 0

    if y1 > y2 and z1 < z2:  # su
        return (south(w1) + down(w2)) * (up(w1) + north(w2)) == 0

    if y1 < y2 and z1 < z2:  # nu
        return (north(w1) + down(w2)) * (up(w1) + south(w2)) == 0

    # Phew! just the straight side pieces left.

    if x1 > x2:  # w
        return west(w1) + east(w2) == 0

    if x1 < x2: # e
        return east(w1) + west(w2) == 0

    if y1 > y2: # s
        return south(w1) + north(w2) == 0

    if y1 < y2:  # n
        return north(w1) + south(w2) == 0

    if z1 > z2:  #d
        return down(w1) + up(w2) == 0

    if z1 < z2:  # u
        return up(w1) + down(w2) == 0

    raise ValueError("This can't happen!")



cpdef unsigned int line_of_sight_3d(
    unsigned char x1, unsigned char y1, unsigned char z1,
    const unsigned char x2, const unsigned char y2, const unsigned char z2,
    dict world):

    """
    Cythonification and slight modification of the C++ code found at
    https://gist.githubusercontent.com/yamamushi/5823518/raw/6571ec0fa01d2e3378a9f5bdebdd9c41b176f4ed/bresenham3d
    Essentially draws a discretized line between two points and checks that no walls or objects are
    in the way. Note that you don't generally get the same line when reversing the order
    of the points.
    """

    cdef int i, dx, dy, dz, l, m, n, x_inc, y_inc, z_inc, err_1, err_2, dx2, dy2, dz2, unit
    cdef unsigned char point[3]
    cdef unsigned char last_point[3]
    #cdef unsigned int x, x0 = -1

    last_point[0] = point[0] = x1
    last_point[1] = point[1] = y1
    last_point[2] = point[2] = z1

    dx = x2 - x1
    dy = y2 - y1
    dz = z2 - z1
    x_inc = -1 if dx < 0 else 1
    l = abs(dx)
    y_inc = -1 if dy < 0 else 1
    m = abs(dy)
    z_inc = -1 if dz < 0 else 1
    n = abs(dz)
    dx2 = l << 1
    dy2 = m << 1
    dz2 = n << 1

    if l >= m and l >= n:
        err_1 = dy2 - l
        err_2 = dz2 - l
        for i in xrange(l):
            if not check_passage(last_point[0], last_point[1], last_point[2],
                                 point[0], point[1], point[2], world):
                return False

            last_point[0] = point[0]
            last_point[1] = point[1]
            last_point[2] = point[2]
            if err_1 > 0:
                point[1] += y_inc
                err_1 -= dx2
            if err_2 > 0:
                point[2] += z_inc
                err_2 -= dx2
            err_1 += dy2
            err_2 += dz2
            point[0] += x_inc
    elif m >= l and m >= n:
        err_1 = dx2 - m
        err_2 = dz2 - m
        for i in xrange(m):
            if not check_passage(last_point[0], last_point[1], last_point[2],
                                 point[0], point[1], point[2], world):
                return False

            last_point[0] = point[0]
            last_point[1] = point[1]
            last_point[2] = point[2]

            if err_1 > 0:
                point[0] += x_inc
                err_1 -= dy2
            if err_2 > 0:
                point[2] += z_inc
                err_2 -= dy2
            err_1 += dx2
            err_2 += dz2
            point[1] += y_inc
    else:
        err_1 = dy2 - n
        err_2 = dx2 - n
        for i in xrange(n):
            if not check_passage(last_point[0], last_point[1], last_point[2],
                                 point[0], point[1], point[2], world):
                return False

            last_point[0] = point[0]
            last_point[1] = point[1]
            last_point[2] = point[2]

            if err_1 > 0:
                point[1] += y_inc
                err_1 -= dz2
            if err_2 > 0:
                point[0] += x_inc
                err_2 -= dz2
            err_1 += dy2
            err_2 += dx2
            point[2] += z_inc

    return check_passage(last_point[0], last_point[1], last_point[2],
                         point[0], point[1], point[2], world)


# # another experimental version, based on raycasting
# cdef line_of_sight_3df(
#     unsigned char x1, unsigned char y1, unsigned char z1,
#     const unsigned char x2, const unsigned char y2, const unsigned char z2,
#     dict world):

#     cdef float x=float(x1), y=float(y1), z=float(z1)
#     cdef float lx = x2-x1, ly = y2-y1, lz = z2-z1
#     cdef float length = sqrt(lx**2 + ly**2 + lz**2), t=0., step=0.2
#     cdef float dx = step*lx/length, dy = step*ly/length, dz = step*lz/length
#     cdef int strength = 3
#     while t <= length:
#         t += step
#         x += dx
#         y += dy
#         z += dz
#         pos = xyz2key(int(round(x)), int(round(y)), int(round(z)))
#         if pos in world:
#             strength -= 1
#         if strength <= 0:
#             return 0
#     return strength
