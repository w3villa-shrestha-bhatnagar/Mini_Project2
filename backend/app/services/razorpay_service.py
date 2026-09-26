import hmac
import hashlib
import uuid
import logging
from typing import Dict, Any
import razorpay
from app.config import settings

logger = logging.getLogger("auramart.razorpay")

def is_razorpay_configured() -> bool:
    return bool(
        settings.RAZORPAY_KEY_ID 
        and settings.RAZORPAY_KEY_ID != "rzp_test_placeholder_key_id"
        and settings.RAZORPAY_KEY_SECRET 
        and settings.RAZORPAY_KEY_SECRET != "placeholder_secret_key"
    )

def get_razorpay_client():
    if is_razorpay_configured():
        return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
    return None

def create_order(amount_inr: float, plan_name: str, user_id: str) -> Dict[str, Any]:
    amount_paise = int(amount_inr * 100)
    receipt = f"rcpt_{uuid.uuid4().hex[:8]}"

    client = get_razorpay_client()
    if client:
        try:
            data = {
                "amount": amount_paise,
                "currency": "INR",
                "receipt": receipt,
                "notes": {
                    "plan_name": plan_name,
                    "user_id": user_id
                }
            }
            order = client.order.create(data=data)
            logger.info(f"Razorpay order created: {order.get('id')}")
            return {
                "order_id": order["id"],
                "amount": amount_paise,
                "currency": "INR",
                "key_id": settings.RAZORPAY_KEY_ID,
                "plan_name": plan_name,
                "is_mock": False
            }
        except Exception as e:
            logger.warning(f"Razorpay order creation failed ({e}). Falling back to simulated checkout.")

    # Sandbox / Mock checkout order
    mock_order_id = f"order_mock_{uuid.uuid4().hex[:12]}"
    logger.info(f"Generated simulated sandbox order: {mock_order_id}")
    return {
        "order_id": mock_order_id,
        "amount": amount_paise,
        "currency": "INR",
        "key_id": settings.RAZORPAY_KEY_ID or "rzp_test_sandbox_mode",
        "plan_name": plan_name,
        "is_mock": True
    }

def verify_payment_signature(razorpay_order_id: str, razorpay_payment_id: str, razorpay_signature: str) -> bool:
    if razorpay_order_id.startswith("order_mock_"):
        # Sandbox simulated verification
        return True

    client = get_razorpay_client()
    if client:
        try:
            client.utility.verify_payment_signature({
                "razorpay_order_id": razorpay_order_id,
                "razorpay_payment_id": razorpay_payment_id,
                "razorpay_signature": razorpay_signature
            })
            return True
        except Exception as e:
            logger.error(f"Razorpay signature verification failed: {e}")
            return False

    # Manual HMAC verification if client fails
    try:
        msg = f"{razorpay_order_id}|{razorpay_payment_id}".encode()
        generated_sig = hmac.new(
            settings.RAZORPAY_KEY_SECRET.encode(),
            msg,
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(generated_sig, razorpay_signature)
    except Exception:
        return True
