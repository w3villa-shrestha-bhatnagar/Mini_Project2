import asyncio
import logging
from datetime import datetime, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.config import settings
from app.database import db_manager

logger = logging.getLogger("auramart.cron")

scheduler = AsyncIOScheduler()

async def check_expired_plans():
    """
    Cron worker checking for active time-limited plans (1h, 6h, 12h) that have exceeded expires_at.
    Automatically deactivates them and updates user status to 'expired' and reverts tier to 'free'.
    """
    try:
        now_utc = datetime.now(timezone.utc)
        now_iso = now_utc.isoformat()
        
        # Query users with active subscription that are not the default free tier
        users_cursor = db_manager.users.find({
            "subscription.status": "active",
            "subscription.plan": {"$ne": "free"}
        })
        active_users = await users_cursor.to_list(length=1000)
        
        expired_count = 0
        for user in active_users:
            sub = user.get("subscription", {})
            expires_at_str = sub.get("expires_at")
            if not expires_at_str:
                continue

            try:
                # Handle ISO format with or without timezone
                if expires_at_str.endswith("Z"):
                    expires_at_str = expires_at_str[:-1] + "+00:00"
                expires_at = datetime.fromisoformat(expires_at_str)
                if expires_at.tzinfo is None:
                    expires_at = expires_at.replace(tzinfo=timezone.utc)
            except Exception as pe:
                logger.warning(f"Could not parse expiry date {expires_at_str} for user {user.get('_id')}: {pe}")
                continue

            if now_utc >= expires_at:
                prev_plan = sub.get("plan")
                history = sub.get("history", [])
                history.append({
                    "event": "expired_by_cron",
                    "previous_plan": prev_plan,
                    "expired_at": now_iso,
                    "scheduled_expiry": expires_at_str
                })
                
                await db_manager.users.update_one(
                    {"_id": user["_id"]},
                    {"$set": {
                        "subscription.status": "expired",
                        "subscription.plan": "free",
                        "subscription.expired_at": now_iso,
                        "subscription.history": history,
                        "updated_at": now_iso
                    }}
                )
                expired_count += 1
                logger.info(f"⏳ [CRON EXPIRED] Plan '{prev_plan}' expired for user {user.get('email')} (ID: {user.get('_id')}). Reverted to Free.")

        if expired_count > 0:
            logger.info(f"✅ [CRON RUN] Successfully expired and deactivated {expired_count} user plans.")

    except Exception as e:
        logger.error(f"Error during plan expiration check: {e}")

def start_cron():
    try:
        scheduler.add_job(
            check_expired_plans,
            "interval",
            seconds=settings.CRON_INTERVAL_SECONDS,
            id="plan_expiration_job",
            replace_existing=True
        )
        scheduler.start()
        logger.info(f"⏰ Plan expiration cron job started (runs every {settings.CRON_INTERVAL_SECONDS}s).")
    except Exception as e:
        logger.error(f"Failed to start cron scheduler: {e}")

def stop_cron():
    try:
        if scheduler.running:
            scheduler.shutdown()
            logger.info("Plan expiration cron job stopped.")
    except Exception as e:
        logger.error(f"Error shutting down scheduler: {e}")
