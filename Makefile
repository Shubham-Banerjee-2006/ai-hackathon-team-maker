.PHONY: help backend-install backend-dev backend-test backend-lint backend-migrate \
        frontend-install frontend-dev frontend-test frontend-lint frontend-build \
        docker-up docker-down seed

help:
	@echo "Common targets:"
	@echo "  make backend-install   Install backend deps (into ./backend/.venv)"
	@echo "  make backend-dev       Run the FastAPI dev server on :8000"
	@echo "  make backend-test      Run backend tests with coverage"
	@echo "  make backend-lint      Run ruff over the backend"
	@echo "  make backend-migrate   Apply Alembic migrations"
	@echo "  make frontend-install  Install frontend deps"
	@echo "  make frontend-dev      Run the Vite dev server on :5173"
	@echo "  make frontend-test     Run frontend tests"
	@echo "  make frontend-lint     Run eslint over the frontend"
	@echo "  make frontend-build    Build the frontend for production"
	@echo "  make seed              Seed the backend DB with sample data"
	@echo "  make docker-up         Build and run both services via Docker Compose"
	@echo "  make docker-down       Stop and remove Docker Compose services"

backend-install:
	cd backend && python3 -m venv .venv && ./.venv/bin/pip install -r requirements-dev.txt

backend-dev:
	cd backend && ./.venv/bin/uvicorn app.main:app --reload --port 8000

backend-test:
	cd backend && ./.venv/bin/python -m pytest --cov=app --cov-report=term-missing

backend-lint:
	cd backend && ./.venv/bin/ruff check app tests

backend-migrate:
	cd backend && ./.venv/bin/alembic upgrade head

seed:
	cd backend && ./.venv/bin/python seed_data.py

frontend-install:
	cd frontend && npm install

frontend-dev:
	cd frontend && npm run dev

frontend-test:
	cd frontend && npm test

frontend-lint:
	cd frontend && npm run lint

frontend-build:
	cd frontend && npm run build

docker-up:
	docker compose up --build

docker-down:
	docker compose down
