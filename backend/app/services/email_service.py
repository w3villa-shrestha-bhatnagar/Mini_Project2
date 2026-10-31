import asyncio
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from app.config import settings

logger = logging.getLogger("auramart.email")

async def send_verification_otp(email: str, name: str, otp: str) -> bool:
    if not settings.BREVO_SMTP_PASSWORD:
        logger.error("Brevo SMTP password is not configured.")
        return False

    message = MIMEMultipart("alternative")
    message["Subject"] = "Your AuraMart verification code"
    message["From"] = settings.BREVO_SENDER_EMAIL
    message["To"] = email
    message.attach(MIMEText(
        f"Hello {name}, your AuraMart verification code is {otp}. It expires in 10 minutes.",
        "plain"
    ))
    message.attach(MIMEText(f"""
        <html><body style="font-family:Arial,sans-serif;color:#20242a">
          <h2>Verify your AuraMart account</h2>
          <p>Hello {name}, enter this code to verify your email address:</p>
          <p style="font-size:30px;font-weight:bold;letter-spacing:8px;color:#db2777">{otp}</p>
          <p>This code expires in 10 minutes. If you did not create an account, you can ignore this email.</p>
        </body></html>
    """, "html"))

    def deliver():
        context = ssl.create_default_context()
        with smtplib.SMTP(settings.BREVO_SMTP_HOST, settings.BREVO_SMTP_PORT, timeout=15) as server:
            server.starttls(context=context)
            server.login(settings.BREVO_SMTP_USER, settings.BREVO_SMTP_PASSWORD)
            server.sendmail(message["From"], [email], message.as_string())

    try:
        await asyncio.to_thread(deliver)
        logger.info("Verification code email sent to %s", email)
        return True
    except Exception:
        logger.exception("Failed to send verification code email to %s", email)
        return False
