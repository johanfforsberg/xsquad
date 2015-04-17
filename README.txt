A two-player turn-based tactical squad game in the browser!

$ cd xsquad
$ virtualenv env
$ . env/bin/activate
$ pip install -r requirements.txt
  [...wait a minute or two...]
$ python server.py

Then point your browser to http://localhost:8989/login

There are currently two hardcoded accounts, player1/password1 and
player2/password2

Tip: by running two browsers you can log in as different players and
play against yourself!

The aim is to get to a bare minimum, XCOM/LaserSquad-like game. It's
far from there, but you can log in, start a game, join a game, walk
around and shoot at each other. Nobody gets hurt and there is no end
to the game.

TODO:
- Gameplay (this is a big one...)
- Persistence; currently ongoing games are just kept in memory
- Actual user accounts, statistics etc
- Levels
- Graphics
- Sound?
- Level editor (or at least a reasonable format)
- Etc
