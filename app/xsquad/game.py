from math import sqrt
from random import random

from los import point2key
from level import Level
from team import Team


ATTACK_MOVEMENT_COST = 25


class GameError(Exception):
    pass


class NotVisible(GameError):
    pass


class NotEnoughMovement(GameError):
    pass


class Game(object):

    def __init__(self, _id, level, players=None, teams=None, size=2):
        self._id = _id

        self.level = level  # the level map

        self.players = players or []
        self.teams = teams or []

        self.size = size
        self.move = 0

    def __repr__(self):
        return str(self.level)

    @property
    def waiting(self):
        return len(self.players) < self.size

    @property
    def active_player(self):
        if self.waiting:
            return False
        return self.players[self.move % 2]

    @property
    def inactive_player(self):
        if self.waiting:
            return False
        return self.players[(self.move + 1) % 2]

    @property
    def active_team(self):
        if self.waiting:
            return False
        return self.teams[self.players.index(self.active_player)]

    @property
    def inactive_team(self):
        if self.waiting:
            return False
        return self.teams[self.players.index(self.inactive_player)]

    @property
    def over(self):
        for team in self.teams:
            if team.eliminated:
                return True

    def get_team(self, player):
        for team in self.teams:
            if team.player == player:
                return team

    def get_opponent(self, player):
        for team in self.teams:
            if team.player != player:
                return team

    def join(self, player):
        if self.waiting:
            self.players.append(player)
            self.teams.append(Team(player=player,
                                   area=(((0, 9), (0, 1), (1, 1))
                                         if len(self.players) == 1
                                         else ((0, 9), (12, 13), (1, 1)))))

    def end_turn(self, player):
        if player == self.active_player:
            self.move += 1
            return True
        else:
            return False

    def get_team_fov(self, team, exclude_members=[]):
        fov = {}
        for i, person in enumerate(team.members):
            if i not in exclude_members:
                person_fov, items = person.field_of_view(self.level)
                fov.update(person_fov)
        if len(self.teams) > 1:
            other_team = (set(self.teams) - set([team])).pop()   # tadaa!
            enemies_seen = [e for e in other_team.members
                            if (point2key(tuple(e.position)) in fov or
                                point2key((e.position[0], e.position[1], e.position[2]+1)) in fov)]
        else:
            enemies_seen = []
        return fov, enemies_seen

    def get_fov(self, team, member):
        fov = {}
        person = team.members[member]
        fov, items = person.field_of_view(self.level)
        if len(self.teams) > 1:
            other_team = (set(self.teams) - set([team])).pop()   # tadaa!
            enemies_seen = [e for e in other_team.members
                            if (point2key(tuple(e.position)) in fov or
                                point2key((e.position[0], e.position[1], e.position[2]+1)) in fov)]
        else:
            enemies_seen = []
        return fov, enemies_seen

    def dbdict(self, player=None):
        if player:
            i = self.players.index(player)
            return dict(id=self._id, level=self.level.dbdict(),
                        players=self.players,
                        my_turn=(player == self.active_player),
                        team=self.teams[i].dbdict())
        else:
            return dict(_id=self._id, level=self.level.dbdict(),
                        players=self.players,
                        teams=[team.dbdict() for team in self.teams])

    def attack(self, attacking_team, attacking_member,
               target_team, target_member):

        if attacking_member.moves < ATTACK_MOVEMENT_COST:
            raise NotEnoughMovement()
        attacking_member.moves -= ATTACK_MOVEMENT_COST

        # check visibility
        origin = attacking_member.viewpoint

        lower_visibility = self.level.check_visibility(origin, target_member.position)
        upper_visibility = self.level.check_visibility(origin, target_member.viewpoint)
        visibility = lower_visibility + upper_visibility
        if visibility == 0:
            raise NotVisible()

        # chance to hit
        distance = sqrt((origin[0] - target_member.position[0])**2 +
                        (origin[1] - target_member.position[1])**2 +
                        (origin[2] - target_member.position[2]+0.5)**2)
        chance = visibility / distance

        # finally, check if the attack is successful
        success = random() < chance
        if success:
            damage = 10 + round(10 * random())
            target_member.health -= damage
            return True
        return False


    @classmethod
    def create(cls, dbdict):
        teams = [Team.create(dbteam) for dbteam in dbdict["teams"]]
        dbdict["teams"] = teams
        dbdict["level"] = Level.create(dbdict["level"])
        game = cls(**dbdict)
        return game
