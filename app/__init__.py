from flask import (Flask, redirect, url_for, request, jsonify,
                   send_from_directory, render_template, flash)

import jinja2

from app.forms import LoginForm


app = Flask(__name__, static_folder='static', static_url_path='')
app.config.from_object('config')
