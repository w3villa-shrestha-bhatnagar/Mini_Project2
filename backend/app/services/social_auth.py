import logging
import requests
from typing import Dict, Any, Optional
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from app.config import settings

logger = logging.getLogger("auramart.social")

async def verify_google_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verifies a Google authentication token (supports both Google ID Tokens and OAuth2 Access Tokens).
    Extracts verified email, name, picture, and unique sub ID.
    """
    if not token or not isinstance(token, str):
        return None

    token = token.strip()

    # 1. Dev / Mock token fallback (if explicitly supplied with format: mock_google___{email}___{name})
    if token.startswith("mock_google_"):
        parts = token.split("___")
        if len(parts) > 1 and parts[1]:
            email = parts[1].lower().strip()
            name = parts[2] if len(parts) > 2 and parts[2] else email.split("@")[0].title()
            return {
                "email": email,
                "name": name,
                "sub": f"google_{email}",
                "picture": f"https://api.dicebear.com/7.x/initials/svg?seed={name}",
                "provider": "google"
            }
        return None

    client_id = settings.GOOGLE_CLIENT_ID.strip() if settings.GOOGLE_CLIENT_ID and not settings.GOOGLE_CLIENT_ID.startswith("placeholder_") else None

    # 2. Try official Google verify_oauth2_token (for Google JWT ID Tokens)
    try:
        idinfo = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            audience=client_id
        )
        if idinfo and idinfo.get("email"):
            return {
                "email": idinfo["email"].lower().strip(),
                "name": idinfo.get("name") or idinfo["email"].split("@")[0].title(),
                "sub": str(idinfo.get("sub", f"google_{idinfo['email']}")),
                "picture": idinfo.get("picture"),
                "provider": "google"
            }
    except Exception as e:
        logger.debug(f"Direct verify_oauth2_token skipped or failed: {e}")

    # 3. Try Google tokeninfo endpoint with id_token
    try:
        resp = requests.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={token}", timeout=6)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("email"):
                return {
                    "email": data["email"].lower().strip(),
                    "name": data.get("name") or data["email"].split("@")[0].title(),
                    "sub": str(data.get("sub", f"google_{data['email']}")),
                    "picture": data.get("picture"),
                    "provider": "google"
                }
    except Exception as e:
        logger.debug(f"Google tokeninfo?id_token check failed: {e}")

    # 4. Try Google UserInfo endpoint (for OAuth2 Access Tokens returned by popup/tokenClient)
    try:
        resp = requests.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {token}"},
            timeout=6
        )
        if resp.status_code == 200:
            data = resp.json()
            if data.get("email"):
                return {
                    "email": data["email"].lower().strip(),
                    "name": data.get("name") or data["email"].split("@")[0].title(),
                    "sub": str(data.get("sub", f"google_{data['email']}")),
                    "picture": data.get("picture"),
                    "provider": "google"
                }
    except Exception as e:
        logger.debug(f"Google userinfo endpoint check failed: {e}")

    # 5. Try Google tokeninfo with access_token parameter
    try:
        resp = requests.get(f"https://oauth2.googleapis.com/tokeninfo?access_token={token}", timeout=6)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("email"):
                return {
                    "email": data["email"].lower().strip(),
                    "name": data.get("name") or data["email"].split("@")[0].title(),
                    "sub": str(data.get("sub") or data.get("user_id") or f"google_{data['email']}"),
                    "picture": data.get("picture"),
                    "provider": "google"
                }
    except Exception as e:
        logger.debug(f"Google tokeninfo?access_token check failed: {e}")

    return None

async def verify_facebook_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verifies a Facebook user access token.
    Extracts verified email, name, picture, and sub ID.
    """
    if not token or not isinstance(token, str):
        return None

    token = token.strip()

    if token.startswith("mock_facebook_"):
        parts = token.split("___")
        if len(parts) > 1 and parts[1]:
            email = parts[1].lower().strip()
            name = parts[2] if len(parts) > 2 and parts[2] else email.split("@")[0].title()
            return {
                "email": email,
                "name": name,
                "sub": f"fb_{email}",
                "picture": f"https://api.dicebear.com/7.x/initials/svg?seed={name}",
                "provider": "facebook"
            }
        return None

    try:
        url = f"https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token={token}"
        resp = requests.get(url, timeout=6)
        if resp.status_code == 200:
            data = resp.json()
            if "error" not in data and data.get("id"):
                email = data.get("email")
                if not email:
                    logger.warning("Facebook account does not have an email address.")
                    return None

                picture_url = None
                if "picture" in data and "data" in data["picture"]:
                    picture_url = data["picture"]["data"].get("url")

                return {
                    "email": email.lower().strip(),
                    "name": data.get("name") or email.split("@")[0].title(),
                    "sub": str(data["id"]),
                    "picture": picture_url,
                    "provider": "facebook"
                }
    except Exception as e:
        logger.error(f"Facebook token verification failed: {e}")

    return None
