#!/bin/sh
# Applies any pending Alembic migrations, then hands off to the given
# command (defaults to the uvicorn server). Keeps "docker run" a true
# one-command deploy: schema is always up to date before the app boots.
set -e

echo "Applying database migrations..."
alembic upgrade head

exec "$@"
