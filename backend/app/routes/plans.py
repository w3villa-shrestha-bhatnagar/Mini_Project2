from fastapi import APIRouter

router = APIRouter(prefix="/plans", tags=["Pricing Plans"])

PLANS_CONFIG = [
    {
        "id": "free",
        "name": "Free Tier",
        "badge": "Standard",
        "description": "Essential shopping experience with standard privileges.",
        "price": 0,
        "discount_percent": 0,
        "available_durations": [
            {"hours": 0, "label": "Perpetual", "price": 0}
        ],
        "features": [
            "Full catalog access",
            "Standard shipping rates",
            "Order tracking & history",
            "Community forum access"
        ],
        "is_popular": False
    },
    {
        "id": "silver",
        "name": "Silver Club",
        "badge": "Popular",
        "description": "Elevate your shopping with accelerated shipping and exclusive 10% discounts.",
        "discount_percent": 10,
        "available_durations": [
            {"hours": 1, "label": "1 Hour Sprint", "price": 199},
            {"hours": 6, "label": "6 Hours Pass", "price": 499}
        ],
        "features": [
            "10% Instant discount on all items",
            "Express same-day shipping",
            "Silver VIP profile badge",
            "Priority customer service",
            "Instant plan activation"
        ],
        "is_popular": True
    },
    {
        "id": "gold",
        "name": "Gold VIP Elite",
        "badge": "Exclusive",
        "description": "The ultimate luxury shopping experience with maximum 25% savings and concierge perks.",
        "discount_percent": 25,
        "available_durations": [
            {"hours": 6, "label": "6 Hours Pass", "price": 699},
            {"hours": 12, "label": "12 Hours VIP Access", "price": 999}
        ],
        "features": [
            "25% Maximum discount on all products",
            "Complimentary 2-hour priority courier",
            "Gold VIP shiny badge",
            "Exclusive early drops & reserve stock",
            "Dedicated 24/7 personal shopper concierge"
        ],
        "is_popular": False
    }
]

@router.get("")
async def get_plans():
    return {
        "status": "success",
        "plans": PLANS_CONFIG
    }
