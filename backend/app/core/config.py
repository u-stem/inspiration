import os
from dataclasses import dataclass, field


def _parse_cors_origins() -> list[str]:
    """Parse CORS_ORIGINS environment variable with validation."""
    origins_str = os.getenv("CORS_ORIGINS", "http://localhost:3000")
    origins = [o.strip() for o in origins_str.split(",") if o.strip()]
    # Reject wildcard with credentials (security issue)
    if "*" in origins and len(origins) == 1:
        raise ValueError(
            "CORS_ORIGINS cannot be '*' when allow_credentials=True. "
            "Specify explicit origins instead."
        )
    return origins


@dataclass(frozen=True)
class Settings:
    index_path: str = os.getenv("INDEX_PATH", "data/rhyme_index.db")
    english_index_path: str = os.getenv("ENGLISH_INDEX_PATH", "data/english_rhyme_index.db")
    api_prefix: str = "/api"
    cors_origins: list[str] = field(default_factory=_parse_cors_origins)


settings = Settings()
