import os
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Settings:
    index_path: str = os.getenv("INDEX_PATH", "data/rhyme_index.db")
    api_prefix: str = "/api"
    cors_origins: list[str] = field(
        default_factory=lambda: os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    )
    admin_api_key: str = os.getenv("ADMIN_API_KEY", "")


settings = Settings()
