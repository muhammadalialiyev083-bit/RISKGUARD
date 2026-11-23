"""Pytest settings: production remains fail-closed while tests use isolated SQLite."""
import os

os.environ.setdefault('DEBUG', 'True')

from .settings import *  # noqa: F403
