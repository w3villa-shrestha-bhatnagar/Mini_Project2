import os
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import db_manager
from app.security import hash_password
from app.cron import start_cron, stop_cron
from app.routes import auth, profile, plans, payments, admin, products

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("auramart")

async def seed_initial_data():
    """Seeds default admin user and sample users if not already present."""
    admin_email = settings.ADMIN_EMAIL.lower().strip()
    existing_admin = await db_manager.users.find_one({"email": admin_email})
    now_iso = datetime.now(timezone.utc).isoformat()

    if not existing_admin:
        admin_doc = {
            "name": settings.ADMIN_NAME,
            "email": admin_email,
            "password_hash": hash_password(settings.ADMIN_PASSWORD),
            "role": "admin",
            "is_verified": True,
            "avatar": f"https://api.dicebear.com/7.x/initials/svg?seed=Admin",
            "avatar_thumb": f"https://api.dicebear.com/7.x/initials/svg?seed=Admin",
            "phone": "+1-800-AURA-MART",
            "address": {
                "formatted_address": "AuraMart Headquarters, Silicon Valley, CA, USA",
                "street": "1 Infinite Loop",
                "city": "Cupertino",
                "state": "California",
                "postal_code": "95014",
                "country": "United States",
                "lat": 37.33182,
                "lng": -122.03118
            },
            "subscription": {
                "plan": "gold",
                "status": "active",
                "duration_hours": None,
                "started_at": now_iso,
                "expires_at": None,
                "history": []
            },
            "social_accounts": {},
            "created_at": now_iso,
            "updated_at": now_iso
        }
        await db_manager.users.insert_one(admin_doc)
        logger.info(f"👑 [ADMIN SEEDED] Default admin created: {admin_email} / {settings.ADMIN_PASSWORD}")
    else:
        # Ensure role is admin and verified
        if existing_admin.get("role") != "admin" or not existing_admin.get("is_verified"):
            await db_manager.users.update_one(
                {"_id": existing_admin["_id"]},
                {"$set": {"role": "admin", "is_verified": True}}
            )

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Starting AuraMart Backend API...")
    await db_manager.connect()
    await seed_initial_data()
    start_cron()
    yield
    # Shutdown
    logger.info("🛑 Shutting down AuraMart Backend API...")
    stop_cron()
    await db_manager.close()

app = FastAPI(
    title="AuraMart Fullstack Platform API",
    description="Backend API for AuraMart E-Commerce, User Management, Membership Plans, and Admin Panel.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
origins = [
    settings.FRONTEND_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static media files for local avatar uploads
static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Include Routers
app.include_router(auth.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
app.include_router(plans.router, prefix="/api")
app.include_router(payments.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(products.router, prefix="/api")

@app.get("/")
async def root():
    return {
        "app": "AuraMart Platform API",
        "version": "1.0.0",
        "status": "online",
        "documentation": "/docs"
    }

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "database": "live_mongo" if db_manager.is_live_mongo else "resilient_store",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
