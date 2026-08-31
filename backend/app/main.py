import logging
import time
import uuid

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from .config import get_settings
from .database import Base, engine, ensure_default_admin
from .logging_config import configure_logging
from .routers import admin, auth, find_teammates, participants, teams

settings = get_settings()
configure_logging()
logger = logging.getLogger("hackteam")

Base.metadata.create_all(bind=engine)
ensure_default_admin(logger=logger)

app = FastAPI(
    title=settings.app_name,
    description=(
        "Analyzes participant skills, experience, and interests with "
        "NLP embeddings + a skill-complementarity algorithm, then runs "
        "an optimizer to form balanced hackathon teams and explains "
        "each team with an AI layer."
    ),
    version=settings.app_version,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_context(request: Request, call_next):
    """Tags every request with an id and logs method/path/status/latency.
    Makes production issues traceable without a heavier APM setup."""
    request_id = request.headers.get("x-request-id", str(uuid.uuid4())[:8])
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    response.headers["X-Request-ID"] = request_id
    logger.info(
        "%s %s -> %s (%.1fms) [%s]",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
        request_id,
    )
    return response


def _error_body(request: Request, detail, code: str) -> dict:
    return {
        "error": {
            "code": code,
            "detail": detail,
            "path": request.url.path,
            "request_id": request.headers.get("x-request-id", ""),
        }
    }


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_body(request, exc.detail, "HTTP_ERROR"),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=_error_body(request, exc.errors(), "VALIDATION_ERROR"),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=_error_body(request, "Internal server error.", "INTERNAL_ERROR"),
    )


app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(participants.router)
app.include_router(teams.router)
app.include_router(find_teammates.router)


@app.get("/api/health", tags=["meta"])
def health():
    return {
        "status": "ok",
        "version": settings.app_version,
        "environment": settings.environment,
        "auth_mode": "admin-login",
    }
