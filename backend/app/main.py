from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import english, japanese, rhyme

app = FastAPI(
    title="Rhyme API",
    description="Japanese rhyme generation API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rhyme.router, prefix=settings.api_prefix)
app.include_router(japanese.router, prefix=settings.api_prefix)
app.include_router(english.router, prefix=settings.api_prefix)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
