from datetime import datetime, timezone, timedelta
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.database import db_manager
from app.security import get_current_verified_user
from app.schemas import (
    CreateOrderRequest,
    CreateProductOrderRequest,
    VerifyPaymentRequest,
    VerifyProductPaymentRequest,
)
from app.services.razorpay_service import create_order, verify_payment_signature
from app.routes.plans import PLANS_CONFIG

router = APIRouter(prefix="/payments", tags=["Payments & Checkout"])

def get_cart_totals(items, current_user):
    plan = current_user.get("subscription", {}).get("plan", "free")
    discount_percent = 25 if plan == "gold" else 10 if plan == "silver" else 0
    subtotal = sum(item["price"] * item["quantity"] for item in items)
    discount = round(subtotal * discount_percent / 100)
    shipping = 0 if plan in ["gold", "silver"] else 499
    return subtotal, discount, shipping, subtotal - discount + shipping

def get_plan_price(plan_name: str, duration_hours: int) -> float:
    for plan in PLANS_CONFIG:
        if plan["id"] == plan_name.lower():
            for d in plan["available_durations"]:
                if d["hours"] == duration_hours:
                    return float(d["price"])
    return None

@router.post("/create-order")
async def create_payment_order(
    payload: CreateOrderRequest,
    current_user: Dict[str, Any] = Depends(get_current_verified_user)
):
    plan_name = payload.plan_name.lower()
    duration_hours = payload.duration_hours

    if plan_name not in ["silver", "gold"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Paid plans can only be 'silver' or 'gold'."
        )

    price = get_plan_price(plan_name, duration_hours)
    if price is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid duration {duration_hours}h for plan '{plan_name}'."
        )

    user_id = str(current_user["_id"])
    order_data = create_order(price, plan_name, user_id)

    # Save order in database
    now_iso = datetime.now(timezone.utc).isoformat()
    await db_manager.orders.insert_one({
        "order_id": order_data["order_id"],
        "user_id": user_id,
        "user_email": current_user["email"],
        "user_name": current_user.get("name"),
        "plan_name": plan_name,
        "duration_hours": duration_hours,
        "amount_inr": price,
        "amount_paise": order_data["amount"],
        "status": "created",
        "is_mock": order_data.get("is_mock", False),
        "created_at": now_iso
    })

    return {
        "status": "success",
        "order": order_data,
        "user_info": {
            "name": current_user.get("name"),
            "email": current_user.get("email"),
            "phone": current_user.get("phone", "")
        }
    }

@router.post("/products/create-order")
async def create_product_payment_order(
    payload: CreateProductOrderRequest,
    current_user: Dict[str, Any] = Depends(get_current_verified_user)
):
    order_items = []
    quantities = {}
    for requested_item in payload.items:
        quantities[requested_item.product_id] = quantities.get(requested_item.product_id, 0) + requested_item.quantity

    for product_id, quantity in quantities.items():
        product = await db_manager.products.find_one({"id": product_id})
        if not product:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product '{product_id}' is no longer available."
            )
        order_items.append({
            "product_id": product_id,
            "title": product["title"],
            "price": float(product["price"]),
            "quantity": quantity,
            "image": product.get("image", "")
        })

    subtotal, discount, shipping, total = get_cart_totals(order_items, current_user)
    user_id = str(current_user["_id"])
    order_data = create_order(total, "product_purchase", user_id)
    now_iso = datetime.now(timezone.utc).isoformat()
    await db_manager.orders.insert_one({
        "order_id": order_data["order_id"],
        "order_type": "product_purchase",
        "user_id": user_id,
        "user_email": current_user["email"],
        "user_name": current_user.get("name"),
        "items": order_items,
        "subtotal_inr": subtotal,
        "discount_inr": discount,
        "shipping_inr": shipping,
        "amount_inr": total,
        "amount_paise": order_data["amount"],
        "status": "created",
        "is_mock": order_data.get("is_mock", False),
        "created_at": now_iso
    })

    return {
        "status": "success",
        "order": order_data,
        "summary": {
            "subtotal": subtotal,
            "discount": discount,
            "shipping": shipping,
            "total": total,
            "items": order_items
        },
        "user_info": {
            "name": current_user.get("name"),
            "email": current_user["email"],
            "phone": current_user.get("phone", "")
        }
    }

@router.post("/products/verify")
async def verify_product_payment(
    payload: VerifyProductPaymentRequest,
    current_user: Dict[str, Any] = Depends(get_current_verified_user)
):
    user_id = str(current_user["_id"])
    order = await db_manager.orders.find_one({
        "order_id": payload.razorpay_order_id,
        "user_id": user_id,
        "order_type": "product_purchase"
    })
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product order not found.")
    if order.get("status") != "created":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This product order is not awaiting payment.")

    is_valid = verify_payment_signature(
        payload.razorpay_order_id,
        payload.razorpay_payment_id,
        payload.razorpay_signature
    )
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment verification failed. Invalid Razorpay signature."
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    await db_manager.orders.update_one(
        {"order_id": payload.razorpay_order_id, "user_id": user_id},
        {"$set": {
            "status": "paid",
            "razorpay_payment_id": payload.razorpay_payment_id,
            "razorpay_signature": payload.razorpay_signature,
            "paid_at": now_iso
        }}
    )
    return {
        "status": "success",
        "message": "Payment verified. Your AuraMart order is confirmed.",
        "order_id": payload.razorpay_order_id
    }

@router.post("/verify")
async def verify_payment(
    payload: VerifyPaymentRequest,
    current_user: Dict[str, Any] = Depends(get_current_verified_user)
):
    is_valid = verify_payment_signature(
        payload.razorpay_order_id,
        payload.razorpay_payment_id,
        payload.razorpay_signature
    )

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment verification failed. Invalid Razorpay signature."
        )

    now_utc = datetime.now(timezone.utc)
    expires_utc = now_utc + timedelta(hours=payload.duration_hours)
    now_iso = now_utc.isoformat()
    expires_iso = expires_utc.isoformat()

    user_id = str(current_user["_id"])
    existing_user = await db_manager.users.find_one({"_id": current_user["_id"]})
    history = existing_user.get("subscription", {}).get("history", []) if existing_user else []
    
    history.append({
        "event": "upgrade_purchase",
        "plan": payload.plan_name.lower(),
        "duration_hours": payload.duration_hours,
        "purchased_at": now_iso,
        "expires_at": expires_iso,
        "razorpay_order_id": payload.razorpay_order_id,
        "razorpay_payment_id": payload.razorpay_payment_id
    })

    new_subscription = {
        "plan": payload.plan_name.lower(),
        "status": "active",
        "duration_hours": payload.duration_hours,
        "started_at": now_iso,
        "expires_at": expires_iso,
        "history": history
    }

    # Update user subscription in database
    await db_manager.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {
            "subscription": new_subscription,
            "updated_at": now_iso
        }}
    )

    # Update order record
    await db_manager.orders.update_one(
        {"order_id": payload.razorpay_order_id},
        {"$set": {
            "status": "paid",
            "razorpay_payment_id": payload.razorpay_payment_id,
            "razorpay_signature": payload.razorpay_signature,
            "paid_at": now_iso
        }}
    )

    remaining_seconds = int((expires_utc - now_utc).total_seconds())

    return {
        "status": "success",
        "message": f"Congratulations! Your {payload.plan_name.title()} Plan is now active for {payload.duration_hours} hours.",
        "subscription": {
            **new_subscription,
            "remaining_seconds": remaining_seconds
        }
    }
