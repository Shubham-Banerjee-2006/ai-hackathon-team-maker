"""Basic structured logging setup, applied once at app startup."""
import logging
import sys

from .config import get_settings


def configure_logging() -> None:
    settings = get_settings()
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter(
            fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%S%z",
        )
    )
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(settings.log_level.upper())

    # Quiet down noisy third-party loggers unless we're debugging.
    if settings.log_level.upper() != "DEBUG":
        logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
