"""
Face AI Service Database Seeding Script.
Ensures database tables are initialized and optionally clears stale verification logs.
"""
import sys
import logging
from app.database import engine, Base, SessionLocal
from app.models import FaceProfile, FaceVerificationLog

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("face-ai-seed")

def seed():
    logger.info("Connecting to face_ai_db and verifying tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Tables face_profiles and face_verification_logs verified.")

    db = SessionLocal()
    try:
        profile_count = db.query(FaceProfile).count()
        log_count = db.query(FaceVerificationLog).count()
        logger.info(f"Database currently contains {profile_count} face profiles and {log_count} verification logs.")
        print(f"Face AI database initialized successfully. Active profiles: {profile_count}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
