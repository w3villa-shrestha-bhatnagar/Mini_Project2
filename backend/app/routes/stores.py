from datetime import datetime, timezone
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query

from app.database import db_manager
from app.schemas import StoreCreate, StoreUpdate
from app.security import get_current_admin_user, get_current_user

router = APIRouter(prefix="/stores", tags=["Stores"])


def _format_store(store: Dict[str, Any]) -> Dict[str, Any]:
    if not store:
        return store
    store = dict(store)
    if "_id" in store:
        store["_id"] = str(store["_id"])
    return store


@router.get("/")
async def get_stores(
    city: Optional[str] = None,
    is_active: Optional[bool] = None
):
    query: Dict[str, Any] = {}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if is_active is not None:
        query["is_active"] = is_active
    else:
        query["is_active"] = True

    stores = await db_manager.stores.find(query).to_list(length=200)
    return {"status": "success", "stores": [_format_store(s) for s in stores]}


@router.get("/aura-noida")
async def get_aura_noida_store():
    store = await db_manager.stores.find_one({"name": {"$regex": "aura", "$options": "i"}, "city": {"$regex": "noida", "$options": "i"}})
    if not store:
        store = {
            "name": "AuraMart - Noida Sector 58",
            "address": "Sector 58, Noida, Uttar Pradesh 201301, India",
            "city": "Noida",
            "state": "Uttar Pradesh",
            "postal_code": "201301",
            "country": "India",
            "phone": "+91-XXXXXXXXXX",
            "lat": 28.6050,
            "lng": 77.3560,
            "is_active": True
        }
    return {"status": "success", "store": _format_store(store)}


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_store(payload: StoreCreate, admin_user: Dict[str, Any] = Depends(get_current_admin_user)):
    now_iso = datetime.now(timezone.utc).isoformat()
    store_doc = payload.model_dump()
    store_doc["created_at"] = now_iso
    store_doc["updated_at"] = now_iso
    res = await db_manager.stores.insert_one(store_doc)
    store_doc["_id"] = str(res.inserted_id)
    return {"status": "success", "message": "Store created successfully", "store": _format_store(store_doc)}


@router.put("/{store_id}")
async def update_store(store_id: str, payload: StoreUpdate, admin_user: Dict[str, Any] = Depends(get_current_admin_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db_manager.stores.update_one({"_id": store_id}, {"$set": updates})
    store = await db_manager.stores.find_one({"_id": store_id})
    if not store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found")
    return {"status": "success", "message": "Store updated successfully", "store": _format_store(store)}


@router.delete("/{store_id}")
async def delete_store(store_id: str, admin_user: Dict[str, Any] = Depends(get_current_admin_user)):
    result = await db_manager.stores.delete_one({"_id": store_id})
    if getattr(result, "deleted_count", 0) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found")
    return {"status": "success", "message": "Store deleted successfully"}
