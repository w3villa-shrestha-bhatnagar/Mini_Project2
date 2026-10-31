from typing import Optional
from fastapi import APIRouter, Query
from app.database import db_manager

router = APIRouter(prefix="/products", tags=["E-Commerce Products"])

DEFAULT_PRODUCTS = [
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
    },
    {
        "id": "prod_7",
        "title": "AeroBeam Mini Speaker",
        "category": "Electronics",
        "price": 7999,
        "rating": 4.7,
        "reviews_count": 86,
        "image": "https://images.unsplash.com/photo-1518444065439-e933c06ce9cd?auto=format&fit=crop&w=600&q=80",
        "description": "Portable Bluetooth speaker with deep bass, IPX7 splash protection, and 18-hour playback."
    },
    {
        "id": "prod_8",
        "title": "Velora Smart Fitness Band",
        "category": "Wellness",
        "price": 4999,
        "rating": 4.5,
        "reviews_count": 71,
        "image": "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&w=600&q=80",
        "description": "Heart-rate tracking, sleep insights, and 7-day battery life in a lightweight performance band."
    },
    {
        "id": "prod_9",
        "title": "NovaRun Pro Sneakers",
        "category": "Fashion",
        "price": 6499,
        "rating": 4.8,
        "reviews_count": 114,
        "image": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80",
        "description": "Responsive cushioning and breathable knit upper designed for everyday comfort and motion."
    },
    {
        "id": "prod_10",
        "title": "PicoBlend Kitchen Mixer",
        "category": "Home Essentials",
        "price": 3999,
        "rating": 4.6,
        "reviews_count": 67,
        "image": "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=600&q=80",
        "description": "Compact countertop blender with smart pulse settings and whisper-quiet operation."
    },
    {
        "id": "prod_11",
        "title": "DriftNest Lounge Chair",
        "category": "Furniture",
        "price": 18999,
        "rating": 4.9,
        "reviews_count": 53,
        "image": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=80",
        "description": "Ergonomic accent chair with memory cushioning, walnut finish, and cloud-soft support."
    },
    {
        "id": "prod_12",
        "title": "PixelPro 4K Camera",
        "category": "Electronics",
        "price": 32999,
        "rating": 4.9,
        "reviews_count": 147,
        "image": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80",
        "description": "4K cinematic capture, dual stabilization, and low-light performance for creators on the move."
    },
    {
        "id": "prod_13",
        "title": "LunaGlow Skin Kit",
        "category": "Beauty",
        "price": 2899,
        "rating": 4.7,
        "reviews_count": 89,
        "image": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=600&q=80",
        "description": "Hydrating daily skincare set with niacinamide, ceramides, and gentle exfoliating care."
    }
]

ADDITIONAL_PRODUCTS = [
    ("AstraFold Wireless Earbuds", "Electronics", 5999, "photo-1590658268037-6bf12165a8df", "Compact wireless earbuds with clear calls, balanced sound, and a pocket-size charging case."),
    ("Northstar Tablet Stand", "Electronics", 2499, "photo-1585790050230-5dd28404ccb9", "Adjustable aluminum stand that keeps tablets steady for work, reading, and video calls."),
    ("PulseArc Smartwatch", "Electronics", 9999, "photo-1523275335684-37898b6baf30", "Everyday smartwatch with activity tracking, message alerts, and a bright touch display."),
    ("SonicWave Soundbar", "Electronics", 13999, "photo-1545454675-3531b543be5d", "Room-filling soundbar with a wireless subwoofer connection and simple TV setup."),
    ("OrbitView Portable Projector", "Electronics", 21999, "photo-1478720568477-152d9b164e26", "Portable full-HD projector with flexible placement for movie nights and presentations."),
    ("KeyNest Compact Keyboard", "Electronics", 7499, "photo-1587829741301-dc798b83add3", "Space-saving wireless keyboard with quiet keys and a comfortable typing angle."),
    ("ClearTone USB Microphone", "Electronics", 6499, "photo-1590602847861-f357a9332bbc", "Plug-and-play USB microphone for clear voice recordings, calls, and streaming."),
    ("SnapLite Ring Light", "Electronics", 3299, "photo-1520857014576-2c4f4c972b57", "Dimmable ring light with adjustable color temperature for desk video and portraits."),
    ("VistaCam Action Camera", "Electronics", 15999, "photo-1516035069371-29a1b244cc32", "Rugged action camera with stabilized video for travel, sport, and everyday adventures."),
    ("CloudCharge Wireless Pad", "Electronics", 1999, "photo-1609091839311-d5365f9ff1c5", "Slim wireless charging pad with a non-slip finish and a discreet status indicator."),
    ("Meridian Leather Card Case", "Accessories", 2299, "photo-1627123424574-724758594e93", "Slim leather card case with neatly stitched edges and quick-access card slots."),
    ("Weekender Canvas Duffel", "Accessories", 6499, "photo-1553062407-98eeb64c6a62", "Durable canvas overnight bag with a roomy main compartment and detachable shoulder strap."),
    ("Crestline Travel Organizer", "Accessories", 1799, "photo-1553531384-411a247ccd73", "Lightweight organizer keeps travel documents, cables, and small essentials together."),
    ("Solstice Polarized Aviators", "Accessories", 4499, "photo-1511499767150-a48a237f0083", "Classic polarized sunglasses with lightweight frames for comfortable daily wear."),
    ("Aurum Minimal Pendant", "Accessories", 3599, "photo-1611652022419-a9419f74343d", "Minimal pendant necklace with a polished finish and an adjustable chain."),
    ("TideMark Classic Belt", "Accessories", 2799, "photo-1627123424574-724758594e93", "Versatile leather belt with a brushed metal buckle and a clean, timeless profile."),
    ("FieldNote Leather Journal", "Accessories", 1499, "photo-1517842645767-c639042777db", "Refillable journal with a soft leather cover for notes, plans, and travel sketches."),
    ("UrbanFold Travel Umbrella", "Accessories", 1299, "photo-1534274988757-a28bf1a57c17", "Compact wind-resistant umbrella with an automatic open button and a travel sleeve."),
    ("LumaCraft Desk Clock", "Home Decor", 2999, "photo-1507473885765-e6ed057f782c", "Quiet desk clock with a clean face and a warm wood-inspired frame."),
    ("Mossline Ceramic Planter Set", "Home Decor", 2499, "photo-1485955900006-10f4d324d411", "Set of three ceramic planters with drainage trays for herbs and small houseplants."),
    ("Arcadia Table Lamp", "Home Decor", 4799, "photo-1507473885765-e6ed057f782c", "Soft ambient table lamp with a fabric shade and an easy-to-reach switch."),
    ("Stillwater Glass Vase", "Home Decor", 1899, "photo-1578500494198-246f612d3b3d", "Hand-finished glass vase designed to complement fresh stems or stand alone."),
    ("Hearthstone Throw Blanket", "Home Decor", 3299, "photo-1600210492486-724fe5c67fb0", "Soft woven throw blanket adds a comfortable layer to a sofa, chair, or bed."),
    ("Contour Wall Mirror", "Home Decor", 7999, "photo-1618221195710-dd6b41faaea6", "Rounded wall mirror with a slim frame suited to entryways and dressing spaces."),
    ("Pebble Ceramic Diffuser", "Home Decor", 2699, "photo-1608571423902-eed4a5ad8108", "Quiet mist diffuser with a simple timer and a soft glow for relaxed evenings."),
    ("Cove Storage Basket", "Home Decor", 1599, "photo-1618220179428-22790b461013", "Woven storage basket for keeping blankets, magazines, and daily essentials tidy."),
    ("Dawnline Cotton Duvet Set", "Home Essentials", 6999, "photo-1631049307264-da0ec9d70304", "Breathable cotton duvet set with a smooth finish and easy-care construction."),
    ("Evergreen Steel Water Bottle", "Home Essentials", 1199, "photo-1602143407151-7111542de6e8", "Reusable insulated bottle keeps drinks close at hand at work, school, or outdoors."),
    ("Stoneware Dinner Set", "Home Essentials", 5499, "photo-1603199506016-b9a594b593c0", "Everyday stoneware dinner set with a durable glaze and a clean modern shape."),
    ("BrewCraft Pour-Over Kit", "Home Essentials", 2899, "photo-1495474472287-4d71bcdd2085", "Pour-over coffee kit with a reusable filter and a heat-safe serving carafe."),
    ("CrispEdge Chef Knife", "Home Essentials", 3499, "photo-1593618998160-e34014e67546", "Balanced stainless-steel chef knife with a comfortable handle for daily prep."),
    ("PureSteam Garment Steamer", "Home Essentials", 4299, "photo-1520607162513-77705c0f0d4a", "Handheld garment steamer smooths everyday fabrics with a quick warm-up."),
    ("BambooNest Cutting Board", "Home Essentials", 1699, "photo-1606913084603-3e7702b01627", "Solid bamboo cutting board with a juice groove and easy-grip side handles."),
    ("FreshKeep Food Container Set", "Home Essentials", 2199, "photo-1606787366850-de6330128bfc", "Stackable food containers help keep pantry staples and leftovers organized."),
    ("CloudRest Memory Pillow", "Home Essentials", 2499, "photo-1631049307264-da0ec9d70304", "Supportive memory-foam pillow with a removable washable cover."),
    ("Sienna Lounge Ottoman", "Furniture", 8999, "photo-1505693416388-ac5ce068fe85", "Compact upholstered ottoman adds a comfortable footrest and extra seating."),
    ("Harborline Side Table", "Furniture", 6799, "photo-1499933374294-4584851497cc", "Small side table with a sturdy frame and a useful shelf for living spaces."),
    ("Rowan Writing Desk", "Furniture", 16999, "photo-1497366754035-f200968a6e72", "Clean-lined writing desk with a generous worktop for a home office."),
    ("Marlow Dining Chair", "Furniture", 10999, "photo-1503602642458-232111445657", "Supportive dining chair with a curved back and durable upholstered seat."),
    ("Juniper Bookcase", "Furniture", 13999, "photo-1594620302200-9a762244a156", "Open bookcase with multiple shelves for books, plants, and display pieces."),
    ("Forme Cotton Overshirt", "Fashion", 4999, "photo-1598033129183-c4f50c736f10", "Layer-ready cotton overshirt with a relaxed cut and practical chest pockets."),
    ("Daybreak Linen Shirt", "Fashion", 3799, "photo-1596755094514-f87e34085b2c", "Lightweight linen-blend shirt with a breathable feel and versatile styling."),
    ("MotionFlex Training Jacket", "Fashion", 5999, "photo-1551028719-00167b16eac5", "Stretch training jacket with a comfortable fit for warmups and everyday layers."),
    ("Cloudstep Everyday Loafers", "Fashion", 7299, "photo-1533867617858-e7b97e060509", "Easy-wearing loafers with cushioned insoles and a flexible everyday sole."),
    ("Studio Knit Beanie", "Fashion", 1299, "photo-1576871337622-98d48d1cf531", "Soft knit beanie with a comfortable cuff for cool-weather commutes."),
    ("Ridgeway Leather Sneakers", "Fashion", 8999, "photo-1542291026-7eec264c27ff", "Minimal leather sneakers with a padded collar and a clean low-profile shape."),
    ("DailyForm Yoga Mat", "Wellness", 2499, "photo-1592432678016-e910b452f9a2", "Textured yoga mat provides steady grip and comfortable cushioning for daily practice."),
    ("CalmCurrent Massage Gun", "Wellness", 7999, "photo-1599058917212-d750089bc07e", "Compact percussion massager with adjustable intensity for post-workout recovery."),
    ("Daylight Sunrise Alarm", "Wellness", 5499, "photo-1506126613408-eca07ce68773", "Gentle sunrise alarm gradually brightens to create a calmer wake-up routine."),
    ("Trailmark Fitness Bottle", "Wellness", 999, "photo-1602143407151-7111542de6e8", "Lightweight sports bottle with a leak-resistant lid for walks and workouts.")
]

DEFAULT_PRODUCTS.extend(
    {
        "id": f"prod_{index + 14}",
        "title": title,
        "category": category,
        "price": price,
        "rating": 4.5 + (index % 5) * 0.1,
        "reviews_count": 28 + index * 7,
        "image": f"https://images.unsplash.com/{photo_id}?auto=format&fit=crop&w=600&q=80",
        "description": description
    }
    for index, (title, category, price, photo_id, description) in enumerate(ADDITIONAL_PRODUCTS)
)

@router.get("")
async def get_products(
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search term")
):
    # Add missing defaults without replacing products already in the store.
    for product in DEFAULT_PRODUCTS:
        existing = await db_manager.products.find_one({"id": product["id"]})
        if not existing:
            await db_manager.products.insert_one(product)

    query = {}
    if category and category != "All":
        query["category"] = {"$regex": f"^{category}$", "$options": "i"}
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]

    cursor = db_manager.products.find(query)
    results = await cursor.to_list(length=100)
    
    # Remove internal _id for response
    for r in results:
        r.pop("_id", None)

    return {
        "status": "success",
        "products": results
    }
