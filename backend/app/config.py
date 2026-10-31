from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:5173"
    
    # JWT
    JWT_SECRET: str = "auramart_super_secret_jwt_key_development_2026_change_in_production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # MongoDB
    MONGODB_URI: str = "mongodb://localhost:27017/auramart"
    MONGODB_DB_NAME: str = "auramart"
    
    # Razorpay
    RAZORPAY_KEY_ID: str = "rzp_test_placeholder_key_id"
    RAZORPAY_KEY_SECRET: str = "placeholder_secret_key"
    
    # Cloudinary
    CLOUDINARY_CLOUD_NAME: str = "placeholder_cloud_name"
    CLOUDINARY_API_KEY: str = "placeholder_api_key"
    CLOUDINARY_API_SECRET: str = "placeholder_api_secret"
    
    # Google OAuth
    GOOGLE_CLIENT_ID: str = "placeholder_google_client_id.apps.googleusercontent.com"
    GOOGLE_CLIENT_SECRET: str = "placeholder_google_secret"
    
    # Facebook OAuth
    FACEBOOK_APP_ID: Optional[str] = "placeholder_facebook_app_id"
    FACEBOOK_APP_SECRET: Optional[str] = "placeholder_facebook_secret"
    
    # SMTP
    BREVO_SMTP_HOST: str = "smtp-relay.brevo.com"
    BREVO_SMTP_PORT: int = 587
    BREVO_SMTP_USER: str = "c0e1d4001@smtp-brevo.com"
    BREVO_SMTP_PASSWORD: Optional[str] = ""
    BREVO_SENDER_EMAIL: str = "no-reply@auramart.com"
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = ""
    SMTP_PASSWORD: Optional[str] = ""
    EMAIL_FROM: str = "no-reply@auramart.com"
    
    # Admin Credentials
    ADMIN_NAME: str = "AuraMart Administrator"
    ADMIN_EMAIL: str = "admin@auramart.com"
    ADMIN_PASSWORD: str = "Admin@123"
    
    # Cron
    CRON_INTERVAL_SECONDS: int = 30

    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
