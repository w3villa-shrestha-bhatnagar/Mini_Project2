import logging
import requests
from typing import Dict, Any, Optional
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from app.config import settings

logger = logging.getLogger("auramart.social")

async def verify_google_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verifies a Google ID token.
    Falls back to Google tokeninfo endpoint or mock simulator if token is simulated.
    """
    if token.startswith("mock_google_"):
        # Simulated test token: mock_google_<email>_<name>
        parts = token.split("___")
        email = parts[1] if len(parts) > 1 else "google_user@example.com"
        name = parts[2] if len(parts) > 2 else "Google User"
        return {
            "email": email,
            "name": name,
            "sub": f"google_{email}",
            "picture": f"https://api.dicebear.com/7.x/avataaars/svg?seed={name}",
            "provider": "google"
        }

    # Attempt official Google verification
    try:
        idinfo = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID if settings.GOOGLE_CLIENT_ID != "placeholder_google_client_id.apps.googleusercontent.com" else None
        )
        return {
            "email": idinfo.get("email"),
            "name": idinfo.get("name", "Google User"),
            "sub": idinfo.get("sub"),
            "picture": idinfo.get("picture"),
            "provider": "google"
        }
    except Exception as e:
        logger.warning(f"Google ID token verification failed ({e}). Checking tokeninfo endpoint.")
        try:
            resp = requests.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={token}", timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "email": data.get("email"),
                    "name": data.get("name", "Google User"),
                    "sub": data.get("sub"),
                    "picture": data.get("picture"),
                    "provider": "google"
                }
        except Exception as e2:
            logger.error(f"Google tokeninfo endpoint failed: {e2}")
    
    return None

async def verify_facebook_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verifies a Facebook user access token.
    Falls back to mock simulator if token is simulated.
    """
    if token.startswith("mock_facebook_"):
        parts = token.split("___")
        email = parts[1] if len(parts) > 1 else "facebook_user@example.com"
        name = parts[2] if len(parts) > 2 else "Facebook User"
        return {
            "email": email,
            "name": name,
            "sub": f"fb_{email}",
            "picture": f"https://api.dicebear.com/7.x/avataaars/svg?seed={name}",
            "provider": "facebook"
        }

    try:
        url = f"https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token={token}"
        resp = requests.get(url, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            picture_url = None
            if "picture" in data and "data" in data["picture"]:
                picture_url = data["picture"]["data"].get("url")
            return {
                "email": data.get("email") or f"{data.get('id')}@facebook.com",
                "name": data.get("name", "Facebook User"),
                "sub": data.get("id"),
                "picture": picture_url,
                "provider": "facebook"
            }
    except Exception as e:
        logger.error(f"Facebook token verification failed: {e}")
    
    return None
