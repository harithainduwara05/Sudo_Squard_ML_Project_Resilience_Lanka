"""
FastAPI application entry point for Resilience-Lanka API.

Manages the full application lifecycle — model loading, MongoDB
connection, CORS configuration, and route registration — using
FastAPI's lifespan context manager.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routes import admin, analytics, auth, feedback, predict
from app.services.db_service import DBService
from app.services.ml_service import MLService

# ── Logging setup ─────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-8s │ %(name)s │ %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════
# Lifespan — startup & shutdown logic
# ═══════════════════════════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application lifecycle.

    On startup:
      1. Load the ML model into memory.
      2. Connect to MongoDB.

    On shutdown:
      1. Close the MongoDB connection.
    """
    logger.info("═" * 60)
    logger.info("  Resilience-Lanka API — Starting up …")
    logger.info("═" * 60)

    # ── Load ML model ─────────────────────────────────────────────────────
    try:
        ml_service = MLService(model_path=settings.MODEL_PATH)
        app.state.ml_service = ml_service
        logger.info("ML service ready ✓")
    except Exception as exc:
        logger.error("Failed to load ML model: %s", exc, exc_info=True)
        raise RuntimeError(
            f"Cannot start without the ML model. Check MODEL_PATH: "
            f"{settings.MODEL_PATH}"
        ) from exc

    # ── Connect to MongoDB ────────────────────────────────────────────────
    try:
        db_service = DBService(
            uri=settings.MONGODB_URI,
            db_name=settings.DB_NAME,
        )
        app.state.db_service = db_service
        logger.info("Database service ready ✓")

        # ── Initialize Auth service ──────────────────────────────────────
        from app.services.auth_service import AuthService
        auth_service = AuthService(db=db_service.db)
        app.state.auth_service = auth_service
        logger.info("Auth service ready ✓")
    except Exception as exc:
        logger.warning(
            "MongoDB connection issue: %s — API will run without persistence.",
            exc,
        )
        # Create a minimal DB service that won't crash the app
        db_service = DBService(
            uri="mongodb://localhost:27017",
            db_name=settings.DB_NAME,
        )
        app.state.db_service = db_service
        
        from app.services.auth_service import AuthService
        auth_service = AuthService(db=db_service.db)
        app.state.auth_service = auth_service

    logger.info("═" * 60)
    logger.info("  Resilience-Lanka API — Ready to serve 🚀")
    logger.info("═" * 60)

    yield  # ← Application runs here

    # ── Shutdown ──────────────────────────────────────────────────────────
    logger.info("Shutting down Resilience-Lanka API …")
    await db_service.close()
    logger.info("Shutdown complete ✓")


# ═══════════════════════════════════════════════════════════════════════════
# Application factory
# ═══════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="Resilience-Lanka: Flood Risk Analytics API",
    description=(
        "Production-grade REST API for predicting flood risk across "
        "Sri Lanka using a pre-trained StackingRegressor ensemble model."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS middleware ───────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register routers ─────────────────────────────────────────────────────
app.include_router(predict.router)
app.include_router(feedback.router)
app.include_router(analytics.router)
app.include_router(auth.router)
app.include_router(admin.router)


# ═══════════════════════════════════════════════════════════════════════════
# Root health-check endpoint
# ═══════════════════════════════════════════════════════════════════════════

@app.get(
    "/",
    tags=["Health"],
    summary="Service health check",
)
async def root():
    """Return basic service status information."""
    return {
        "status": "online",
        "service": "Resilience-Lanka API",
    }


# ═══════════════════════════════════════════════════════════════════════════
# Dependency helpers (alternative to per-route definitions)
# ═══════════════════════════════════════════════════════════════════════════

def get_ml_service(request: Request) -> MLService:
    """FastAPI dependency — provides the ML service instance."""
    return request.app.state.ml_service


def get_db_service(request: Request) -> DBService:
    """FastAPI dependency — provides the DB service instance."""
    return request.app.state.db_service
