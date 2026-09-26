from typing import Optional
from fastapi import APIRouter, Query

router = APIRouter(prefix="/products", tags=["E-Commerce Products"])

SAMPLE_PRODUCTS = [
    {
        "id": "prod_1",
        "title": "Aura Chrono Luxe Watch",
        "category": "Accessories",
        "price": 14999,
        "rating": 4.9,
        "reviews_count": 128,
        "image": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80",
        "description": "Minimalist sapphire glass chronograph with automatic movement and aerospace titanium finish."
    },
    {
        "id": "prod_2",
        "title": "SonicPure ANC Headphones",
        "category": "Electronics",
        "price": 18499,
        "rating": 4.8,
        "reviews_count": 94,
        "image": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
        "description": "Studio-grade lossless audio with 40-hour battery life and spatial audio immersion."
    },
    {
        "id": "prod_3",
        "title": "Aura Vision Cyber Sunglasses",
        "category": "Fashion",
        "price": 6999,
        "rating": 4.7,
        "reviews_count": 62,
        "image": "https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=600&q=80",
        "description": "Polarized UV400 lenses housed in handcrafted Italian acetate with subtle iridescent reflections."
    },
    {
        "id": "prod_4",
        "title": "NeoGrip Mechanical Keyboard",
        "category": "Electronics",
        "price": 11999,
        "rating": 4.9,
        "reviews_count": 210,
        "image": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80",
        "description": "Custom aluminum body with hot-swappable tactile switches and per-key customizable RGB."
    },
    {
        "id": "prod_5",
        "title": "Monolith Smart Travel Backpack",
        "category": "Accessories",
        "price": 8999,
        "rating": 4.8,
        "reviews_count": 75,
        "image": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80",
        "description": "Waterproof Cordura ballistic nylon with integrated MagSafe charging pass-through and TSA lock."
    },
    {
        "id": "prod_6",
        "title": "Lumix Ambient Horizon Lamp",
        "category": "Home Decor",
        "price": 5499,
        "rating": 4.6,
        "reviews_count": 48,
        "image": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=600&q=80",
        "description": "Biophilic circadian lighting that synchronizes with sunrise and sunset color temperatures."
    }
]

@router.get("")
async def get_products(
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search term")
):
    results = SAMPLE_PRODUCTS
    if category and category != "All":
        results = [p for p in results if p["category"].lower() == category.lower()]
    if search:
        s = search.lower()
        results = [p for p in results if s in p["title"].lower() or s in p["description"].lower()]
    
    return {
        "status": "success",
        "products": results
    }
