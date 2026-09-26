import os
import uuid
import logging
from typing import Tuple
import cloudinary
import cloudinary.uploader
from app.config import settings

logger = logging.getLogger("auramart.cloudinary")

def is_cloudinary_configured() -> bool:
    return bool(
        settings.CLOUDINARY_CLOUD_NAME 
        and settings.CLOUDINARY_CLOUD_NAME != "placeholder_cloud_name"
        and settings.CLOUDINARY_API_KEY 
        and settings.CLOUDINARY_API_KEY != "placeholder_api_key"
        and settings.CLOUDINARY_API_SECRET 
        and settings.CLOUDINARY_API_SECRET != "placeholder_api_secret"
    )

async def upload_profile_image(file_bytes: bytes, filename: str) -> Tuple[str, str]:
    """
    Uploads profile picture to Cloudinary.
    Falls back to local static storage if Cloudinary credentials are not configured or request fails.
    Returns (image_url, thumbnail_url).
    """
    if is_cloudinary_configured():
        try:
            cloudinary.config(
                cloud_name=settings.CLOUDINARY_CLOUD_NAME,
                api_key=settings.CLOUDINARY_API_KEY,
                api_secret=settings.CLOUDINARY_API_SECRET,
                secure=True
            )
            response = cloudinary.uploader.upload(
                file_bytes,
                folder="auramart/avatars",
                transformation=[
                    {'width': 400, 'height': 400, 'crop': 'fill', 'gravity': 'face'},
                    {'quality': 'auto'}
                ]
            )
            secure_url = response.get("secure_url")
            # Generate thumbnail URL
            thumb_url = response.get("secure_url")
            if "upload/" in secure_url:
                thumb_url = secure_url.replace("upload/", "upload/c_thumb,w_120,h_120,g_face/")
            logger.info(f"Image uploaded to Cloudinary: {secure_url}")
            return secure_url, thumb_url
        except Exception as e:
            logger.warning(f"Cloudinary upload failed ({e}). Falling back to local static storage.")

    # Local fallback
    static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "static", "avatars")
    os.makedirs(static_dir, exist_ok=True)
    ext = os.path.splitext(filename)[1] or ".jpg"
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    target_path = os.path.join(static_dir, unique_filename)
    
    with open(target_path, "wb") as f:
        f.write(file_bytes)
        
    local_url = f"http://localhost:{settings.PORT}/static/avatars/{unique_filename}"
    return local_url, local_url
