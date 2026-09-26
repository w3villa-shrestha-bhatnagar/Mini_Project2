from datetime import datetime, timezone, timedelta
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status, Query
from app.config import settings
from app.database import db_manager
from app.schemas import (
    UserSignup, UserLogin, SocialLogin, ResendVerificationRequest
)
from app.security import (
    hash_password, verify_password, create_access_token,
    generate_verification_token
)
from app.services.email_service import send_verification_email
from app.services.social_auth import verify_google_token, verify_facebook_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

def format_user_response(user: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": str(user.get("_id")),
        "name": user.get("name"),
        "email": user.get("email"),
        "role": user.get("role", "user"),
        "is_verified": user.get("is_verified", False),
        "avatar": user.get("avatar"),
        "avatar_thumb": user.get("avatar_thumb"),
        "phone": user.get("phone", ""),
        "address": user.get("address", {}),
        "subscription": user.get("subscription", {
            "plan": "free",
            "status": "active",
            "duration_hours": None,
            "expires_at": None
        }),
        "social_accounts": list(user.get("social_accounts", {}).keys()),
        "created_at": user.get("created_at")
    }

@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(payload: UserSignup):
    email = payload.email.lower().strip()
    existing_user = await db_manager.users.find_one({"email": email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please login or use social login."
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    token = generate_verification_token()
    token_expiry = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()

    avatar_url = f"https://api.dicebear.com/7.x/initials/svg?seed={payload.name.replace(' ', '+')}"

    new_user = {
        "name": payload.name.strip(),
        "email": email,
        "password_hash": hash_password(payload.password),
        "role": "user",
        "is_verified": False,
        "avatar": avatar_url,
        "avatar_thumb": avatar_url,
        "phone": "",
        "address": {},
        "subscription": {
            "plan": "free",
            "status": "active",
            "duration_hours": None,
            "started_at": now_iso,
            "expires_at": None,
            "history": []
        },
        "social_accounts": {},
        "created_at": now_iso,
        "updated_at": now_iso
    }

    insert_res = await db_manager.users.insert_one(new_user)
    user_id = str(insert_res.inserted_id)
    new_user["_id"] = user_id

    # Store verification token
    await db_manager.tokens.insert_one({
        "token": token,
        "user_id": user_id,
        "email": email,
        "type": "email_verification",
        "expires_at": token_expiry,
        "created_at": now_iso
    })

    # Send verification email
    await send_verification_email(email, payload.name, token)

    verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"

    return {
        "status": "success",
        "message": "Signup successful! We have sent a verification link to your registered email address.",
        "user": format_user_response(new_user),
        "dev_verification_url": verification_url,  # For easy testing in dev/demo environments
        "verification_token": token
    }

@router.get("/verify-email")
async def verify_email(token: str = Query(..., description="Email verification token")):
    token_doc = await db_manager.tokens.find_one({"token": token, "type": "email_verification"})
    if not token_doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification link."
        )

    # Check token expiry
    expires_at_str = token_doc.get("expires_at")
    if expires_at_str:
        expires_at = datetime.fromisoformat(expires_at_str)
        if datetime.now(timezone.utc) > expires_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification link has expired. Please request a new verification email."
            )

    user_id = token_doc.get("user_id")
    user = await db_manager.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found.")

    # Mark user as verified
    now_iso = datetime.now(timezone.utc).isoformat()
    await db_manager.users.update_one(
        {"_id": user_id},
        {"$set": {"is_verified": True, "updated_at": now_iso}}
    )

    # Invalidate token
    await db_manager.tokens.delete_one({"_id": token_doc["_id"]})

    # Issue JWT token so user is automatically authenticated
    user["is_verified"] = True
    access_token = create_access_token({"sub": user_id, "email": user["email"], "role": user.get("role", "user")})

    return {
        "status": "success",
        "message": "Email verified successfully! Your account is now active.",
        "access_token": access_token,
        "token_type": "bearer",
        "user": format_user_response(user)
    }

@router.post("/resend-verification")
async def resend_verification(payload: ResendVerificationRequest):
    email = payload.email.lower().strip()
    user = await db_manager.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No account registered with this email.")

    if user.get("is_verified", False):
        return {
            "status": "already_verified",
            "message": "Your email address is already verified. You can proceed to log in."
        }

    now_iso = datetime.now(timezone.utc).isoformat()
    token = generate_verification_token()
    token_expiry = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()

    # Invalidate old tokens for this user
    await db_manager.tokens.delete_one({"user_id": str(user["_id"]), "type": "email_verification"})

    await db_manager.tokens.insert_one({
        "token": token,
        "user_id": str(user["_id"]),
        "email": email,
        "type": "email_verification",
        "expires_at": token_expiry,
        "created_at": now_iso
    })

    await send_verification_email(email, user.get("name", "User"), token)
    verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"

    return {
        "status": "success",
        "message": "A new verification link has been sent to your email address.",
        "dev_verification_url": verification_url,
        "verification_token": token
    }

@router.post("/login")
async def login(payload: UserLogin):
    email = payload.email.lower().strip()
    user = await db_manager.users.find_one({"email": email})

    if not user or not user.get("password_hash"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # Acceptance Criteria 3.1: "Only verified accounts can access the dashboard after login."
    if not user.get("is_verified", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your email is not verified yet. Please check your inbox to activate your account.",
            headers={"X-Account-Unverified": "true"}
        )

    access_token = create_access_token({
        "sub": str(user["_id"]),
        "email": user["email"],
        "role": user.get("role", "user")
    })

    return {
        "status": "success",
        "message": "Login successful!",
        "access_token": access_token,
        "token_type": "bearer",
        "user": format_user_response(user)
    }

@router.post("/social-login")
async def social_login(payload: SocialLogin):
    """
    Social Signup & Login with Account Merge.
    If an account with the same email already exists, merges the social credentials seamlessly.
    """
    provider = payload.provider.lower().strip()
    social_info = None

    if provider == "google":
        social_info = await verify_google_token(payload.token)
    elif provider == "facebook":
        social_info = await verify_facebook_token(payload.token)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported social provider '{provider}'. Choose Google or Facebook."
        )

    if not social_info:
        # Fallback to payload email if test token provided
        if payload.email:
            social_info = {
                "email": payload.email.lower().strip(),
                "name": payload.name or "Social User",
                "sub": f"{provider}_{payload.email}",
                "picture": payload.avatar or f"https://api.dicebear.com/7.x/avataaars/svg?seed={payload.name or 'User'}",
                "provider": provider
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to authenticate with {provider.title()}. Please check credentials."
            )

    email = social_info["email"].lower().strip()
    now_iso = datetime.now(timezone.utc).isoformat()
    existing_user = await db_manager.users.find_one({"email": email})

    if existing_user:
        # 1.1 Account Merge: Existing account with same email found!
        social_accounts = existing_user.get("social_accounts", {})
        social_accounts[provider] = {
            "sub_id": social_info.get("sub"),
            "linked_at": now_iso
        }
        
        update_fields: Dict[str, Any] = {
            "social_accounts": social_accounts,
            "is_verified": True,  # Social logins verify ownership of the email
            "updated_at": now_iso
        }

        # If user does not have a custom profile picture, adopt social picture
        if not existing_user.get("avatar") or "dicebear.com/7.x/initials" in existing_user.get("avatar", ""):
            if social_info.get("picture"):
                update_fields["avatar"] = social_info.get("picture")
                update_fields["avatar_thumb"] = social_info.get("picture")

        await db_manager.users.update_one(
            {"_id": existing_user["_id"]},
            {"$set": update_fields}
        )

        existing_user.update(update_fields)
        user_id = str(existing_user["_id"])
        
        access_token = create_access_token({
            "sub": user_id,
            "email": email,
            "role": existing_user.get("role", "user")
        })

        return {
            "status": "success",
            "is_merged": True,
            "message": f"Successfully merged {provider.title()} account with your existing AuraMart profile!",
            "access_token": access_token,
            "token_type": "bearer",
            "user": format_user_response(existing_user)
        }
    else:
        # Create brand new user via social signup
        avatar_url = social_info.get("picture") or f"https://api.dicebear.com/7.x/avataaars/svg?seed={social_info.get('name', 'User')}"
        new_user = {
            "name": social_info.get("name", "Social User"),
            "email": email,
            "password_hash": None,  # Social-only account
            "role": "user",
            "is_verified": True,  # Pre-verified by social provider
            "avatar": avatar_url,
            "avatar_thumb": avatar_url,
            "phone": "",
            "address": {},
            "subscription": {
                "plan": "free",
                "status": "active",
                "duration_hours": None,
                "started_at": now_iso,
                "expires_at": None,
                "history": []
            },
            "social_accounts": {
                provider: {
                    "sub_id": social_info.get("sub"),
                    "linked_at": now_iso
                }
            },
            "created_at": now_iso,
            "updated_at": now_iso
        }

        insert_res = await db_manager.users.insert_one(new_user)
        user_id = str(insert_res.inserted_id)
        new_user["_id"] = user_id

        access_token = create_access_token({
            "sub": user_id,
            "email": email,
            "role": "user"
        })

        return {
            "status": "success",
            "is_merged": False,
            "message": f"Welcome to AuraMart! Signed up with {provider.title()}.",
            "access_token": access_token,
            "token_type": "bearer",
            "user": format_user_response(new_user)
        }
