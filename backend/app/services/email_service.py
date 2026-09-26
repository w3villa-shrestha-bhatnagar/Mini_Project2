import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from app.config import settings

logger = logging.getLogger("auramart.email")

async def send_verification_email(email: str, name: str, token: str) -> bool:
    verification_link = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    
    logger.info("=" * 70)
    logger.info(f"📧 [EMAIL VERIFICATION LINK] For: {email}")
    logger.info(f"🔗 Verification URL: {verification_link}")
    logger.info("=" * 70)
    
    # Check if SMTP is configured
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.info("SMTP not fully configured; link logged above for testing.")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Verify Your AuraMart Account"
        msg["From"] = settings.EMAIL_FROM or settings.SMTP_USER
        msg["To"] = email

        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 12px; border: 1px solid #334155; padding: 32px; }}
                .logo {{ font-size: 24px; font-weight: bold; color: #38bdf8; text-decoration: none; display: inline-block; margin-bottom: 20px; }}
                h2 {{ color: #ffffff; margin-top: 0; }}
                p {{ color: #94a3b8; line-height: 1.6; font-size: 16px; }}
                .btn {{ display: inline-block; background: linear-gradient(135deg, #0ea5e9, #6366f1); color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 24px 0; }}
                .footer {{ border-top: 1px solid #334155; padding-top: 16px; margin-top: 24px; font-size: 12px; color: #64748b; }}
            </style>
        </head>
        <body>
            <div class="container">
                <a href="{settings.FRONTEND_URL}" class="logo">✨ AuraMart</a>
                <h2>Welcome to AuraMart, {name}!</h2>
                <p>Thank you for creating an account with us. To activate your account and start enjoying member privileges, please verify your email address by clicking the button below:</p>
                <div style="text-align: center;">
                    <a href="{verification_link}" class="btn">Verify My Email</a>
                </div>
                <p>Or copy and paste this URL into your browser:</p>
                <p style="word-break: break-all; color: #38bdf8;">{verification_link}</p>
                <div class="footer">
                    <p>If you did not sign up for AuraMart, please ignore this email.</p>
                </div>
            </div>
        </body>
        </html>
        """
        msg.attach(MIMEText(html, "html"))

        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(msg["From"], [email], msg.as_string())
        server.quit()
        logger.info(f"Verification email sent successfully to {email}")
        return True
    except Exception as e:
        logger.warning(f"Failed to send email via SMTP ({e}). Dev link still available in logs.")
        return False
