from gevent.pywsgi import WSGIServer
import werkzeug.serving

from app import app, views  # views needs to be imported


@werkzeug.serving.run_with_reloader
def runserver():
    app.debug = True
    http_server = WSGIServer(('', 8989), app)
    http_server.serve_forever()


if __name__ == '__main__':
    runserver()
