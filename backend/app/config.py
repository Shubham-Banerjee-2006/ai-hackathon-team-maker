"""
Centralized application settings.

Everything configurable lives here and is sourced from environment
variables (or a local .env file) via pydantic-settings, instead of being
scattered as ad-hoc os.getenv() calls across the codebase. This is the
single place to look when deploying to a new environment.
"""
import secrets
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- App metadata ---
    app_name: str = "AI Hackathon Team Maker"
    app_version: str = "3.0.0"
    environment: str = "development"  # development | production | test

    # --- Database ---
    database_url: str = "sqlite:///./hackteam.db"

    # --- Admin authentication (real login, not a shared header key) ---
    # A JWT-based admin login system. On first startup, if no admin user
    # exists yet, one is created automatically so the project still runs
    # with zero setup for local dev/hackathon demos:
    #   - username: ADMIN_BOOTSTRAP_USERNAME (default "admin")
    #   - password: ADMIN_BOOTSTRAP_PASSWORD if set, otherwise a random
    #     password is generated and printed once to the server logs.
    # Set both explicitly before deploying publicly.
    admin_bootstrap_username: str = "admin"
    admin_bootstrap_password: str = ""

    # Secret used to sign admin session tokens (JWT/HS256). Falls back to a
    # random value generated per-process if unset -- fine for local/dev,
    # but MUST be set to a stable secret in production or every restart
    # invalidates existing sessions.
    jwt_secret: str = secrets.token_hex(32)
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 60 * 12  # 12 hour admin sessions

    # --- CORS ---
    cors_origins: str = "*"  # comma-separated list, or "*" for any origin

    # --- AI explanation layer ---
    anthropic_api_key: str = ""

    # --- Misc ---
    log_level: str = "INFO"
    default_page_size: int = 50
    max_page_size: int = 200

    @property
    def cors_origin_list(self) -> list[str]:
        if self.cors_origins.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance -- read once, reused everywhere."""
    return Settings()
