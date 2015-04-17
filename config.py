import os

CSRF_ENABLED = True
SECRET_KEY = "mapohuocanpc"  # os.urandom(24)

basedir = os.path.abspath(os.path.dirname(__file__))

SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(basedir, 'app.db')
SQLALCHEMY_MIGRATE_REPO = os.path.join(basedir, 'db_repository')

USERS = {
    "player1": {"password": "password1"},
    "player2": {"password": "password2"},
}
