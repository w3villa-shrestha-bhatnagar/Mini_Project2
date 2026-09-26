from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.database import db_manager
from app.security import get_current_admin_user
from app.schemas import (
    AdminUpdateRoleRequest, AdminUpdateVerifyRequest, AdminManualPlanRequest
)
from app.routes.auth import format_user_response

router = APIRouter(prefix="/admin", tags=["Admin Management"])

@router.get("/stats")
async def get_admin_dashboard_stats(admin_user: Dict[str, Any] = Depends(get_current_admin_user)):
    all_users = await db_manager.users.find({}).to_list(length=10000)
    total_users = len(all_users)
    verified_users = sum(1 for u in all_users if u.get("is_verified"))
    unverified_users = total_users - verified_users
    
    active_plans = sum(
        1 for u in all_users 
        if u.get("subscription", {}).get("status") == "active" 
        and u.get("subscription", {}).get("plan") != "free"
    )
    expired_plans = sum(
        1 for u in all_users 
        if u.get("subscription", {}).get("status") == "expired"
    )
    
    orders = await db_manager.orders.find({"status": "paid"}).to_list(length=10000)
    total_revenue = sum(o.get("amount_inr", 0) for o in orders)

    return {
        "status": "success",
        "stats": {
            "total_users": total_users,
            "verified_users": verified_users,
            "unverified_users": unverified_users,
            "active_plans": active_plans,
            "expired_plans": expired_plans,
            "paid_orders": len(orders),
            "total_revenue_inr": round(total_revenue, 2)
        }
    }

@router.get("/users")
async def list_users(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search term for name or email"),
    role: Optional[str] = Query("all", description="Filter by role: all, user, admin"),
    is_verified: Optional[str] = Query("all", description="Filter by verification: all, true, false"),
    plan: Optional[str] = Query("all", description="Filter by plan: all, free, silver, gold"),
    plan_status: Optional[str] = Query("all", description="Filter by plan status: all, active, expired"),
    admin_user: Dict[str, Any] = Depends(get_current_admin_user)
):
    """
    Requirements 6.2 - 6.5:
    Admin user listing with search, filtering (role, verified, plan, plan_status), and pagination.
    """
    query: Dict[str, Any] = {}

    if search and search.strip():
        term = search.strip()
        query["$or"] = [
            {"name": {"$regex": term, "$options": "i"}},
            {"email": {"$regex": term, "$options": "i"}}
        ]

    if role and role != "all":
        query["role"] = role

    if is_verified and is_verified != "all":
        query["is_verified"] = (is_verified.lower() == "true")

    if plan and plan != "all":
        query["subscription.plan"] = plan.lower()

    if plan_status and plan_status != "all":
        query["subscription.status"] = plan_status.lower()

    # Total matching count
    total_count = await db_manager.users.count_documents(query)
    
    # Calculate pagination
    skip_val = (page - 1) * limit
    users_cursor = db_manager.users.find(query).sort("created_at", -1).skip(skip_val).limit(limit)
    users_list = await users_cursor.to_list(length=limit)

    total_pages = max(1, (total_count + limit - 1) // limit)

    return {
        "status": "success",
        "users": [format_user_response(u) for u in users_list],
        "pagination": {
            "page": page,
            "limit": limit,
            "total_count": total_count,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1
        }
    }

@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    payload: AdminUpdateRoleRequest,
    admin_user: Dict[str, Any] = Depends(get_current_admin_user)
):
    if payload.role not in ["user", "admin"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role must be 'user' or 'admin'.")

    user = await db_manager.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    # Protect against demoting the root admin
    if user["email"] == "admin@auramart.com" and payload.role != "admin":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot demote primary administrator account.")

    now_iso = datetime.now(timezone.utc).isoformat()
    await db_manager.users.update_one(
        {"_id": user_id},
        {"$set": {"role": payload.role, "updated_at": now_iso}}
    )

    return {
        "status": "success",
        "message": f"User role updated to '{payload.role}'."
    }

@router.put("/users/{user_id}/verify")
async def update_user_verification(
    user_id: str,
    payload: AdminUpdateVerifyRequest,
    admin_user: Dict[str, Any] = Depends(get_current_admin_user)
):
    user = await db_manager.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    now_iso = datetime.now(timezone.utc).isoformat()
    await db_manager.users.update_one(
        {"_id": user_id},
        {"$set": {"is_verified": payload.is_verified, "updated_at": now_iso}}
    )

    state_str = "verified" if payload.is_verified else "unverified"
    return {
        "status": "success",
        "message": f"User marked as {state_str}."
    }

@router.post("/users/{user_id}/plan")
async def admin_manual_plan_override(
    user_id: str,
    payload: AdminManualPlanRequest,
    admin_user: Dict[str, Any] = Depends(get_current_admin_user)
):
    user = await db_manager.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    plan_name = payload.plan_name.lower()
    now_utc = datetime.now(timezone.utc)
    now_iso = now_utc.isoformat()

    if plan_name == "free":
        new_sub = {
            "plan": "free",
            "status": "active",
            "duration_hours": None,
            "started_at": now_iso,
            "expires_at": None,
            "history": user.get("subscription", {}).get("history", []) + [{
                "event": "admin_reset_free",
                "by": admin_user["email"],
                "timestamp": now_iso
            }]
        }
    else:
        expires_utc = now_utc + timedelta(hours=payload.duration_hours)
        new_sub = {
            "plan": plan_name,
            "status": "active",
            "duration_hours": payload.duration_hours,
            "started_at": now_iso,
            "expires_at": expires_utc.isoformat(),
            "history": user.get("subscription", {}).get("history", []) + [{
                "event": "admin_manual_grant",
                "plan": plan_name,
                "duration_hours": payload.duration_hours,
                "by": admin_user["email"],
                "timestamp": now_iso
            }]
        }

    await db_manager.users.update_one(
        {"_id": user_id},
        {"$set": {"subscription": new_sub, "updated_at": now_iso}}
    )

    return {
        "status": "success",
        "message": f"User plan successfully updated to '{plan_name.title()}'.",
        "subscription": new_sub
    }

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    admin_user: Dict[str, Any] = Depends(get_current_admin_user)
):
    user = await db_manager.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if user["email"] == "admin@auramart.com":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete root admin account.")

    await db_manager.users.delete_one({"_id": user_id})
    return {
        "status": "success",
        "message": f"User account for '{user.get('email')}' deleted successfully."
    }
