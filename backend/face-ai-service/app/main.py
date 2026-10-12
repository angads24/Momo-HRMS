import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.routers import face, health

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("face-ai-service")

# Production security validation
if settings.ENVIRONMENT == "production":
    if settings.GATEWAY_SHARED_SECRET in ["dev-gateway-secret", ""] or len(settings.GATEWAY_SHARED_SECRET) < 32:
        raise ValueError("FATAL: GATEWAY_SHARED_SECRET is insecure in production (must be >= 32 characters)!")
    if settings.FACE_JWT_SECRET in ["dev-face-secret-key-change-in-prod", ""] or len(settings.FACE_JWT_SECRET) < 32:
        raise ValueError("FATAL: FACE_JWT_SECRET is insecure in production (must be >= 32 characters)!")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database tables for face_ai_db...")
    Base.metadata.create_all(bind=engine)
    logger.info("Face AI Service startup complete.")
    yield
    logger.info("Face AI Service shutting down.")

app = FastAPI(
    title="Face AI & Biometrics Service",
    description="Face enrollment, active liveness verification, and anti-spoofing microservice",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://localhost:8081",
    "http://localhost:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(health.router)
app.include_router(health.router, prefix=settings.API_PREFIX)
app.include_router(face.router, prefix=settings.API_PREFIX)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
