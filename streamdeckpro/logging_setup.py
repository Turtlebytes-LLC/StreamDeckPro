"""Logging configuration: stdout (journal-friendly) + rotating file."""

import logging
from logging.handlers import RotatingFileHandler

from .config import LOGS_DIR, LOG_FILE

FORMAT = "%(asctime)s %(levelname)s %(name)s: %(message)s"


def setup_logging(level=logging.INFO):
    """Configure the root logger with a stdout stream handler and a rotating
    file handler (10 MB x 3 backups). Idempotent."""
    LOGS_DIR.mkdir(parents=True, exist_ok=True)

    root = logging.getLogger()
    root.setLevel(level)

    # Clear any pre-existing handlers so re-invocation stays clean.
    for handler in list(root.handlers):
        root.removeHandler(handler)

    formatter = logging.Formatter(FORMAT)

    stream = logging.StreamHandler()
    stream.setLevel(level)
    stream.setFormatter(formatter)
    root.addHandler(stream)

    file_handler = RotatingFileHandler(
        LOG_FILE, maxBytes=10_000_000, backupCount=3
    )
    file_handler.setLevel(level)
    file_handler.setFormatter(formatter)
    root.addHandler(file_handler)

    return root
