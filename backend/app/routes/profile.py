import io
from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Response
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

from app.database import db_manager
from app.security import get_current_verified_user
from app.schemas import UserProfileUpdate
from app.services.cloudinary_service import upload_profile_image
from app.routes.auth import format_user_response

router = APIRouter(prefix="/profile", tags=["Profile Management"])

@router.get("/me")
async def get_my_profile(current_user: Dict[str, Any] = Depends(get_current_verified_user)):
    user = await db_manager.users.find_one({"_id": current_user["_id"]})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    
    # Calculate remaining subscription seconds if plan is active and has an expiry date
    res = format_user_response(user)
    sub = user.get("subscription", {})
    expires_at_str = sub.get("expires_at")
    remaining_seconds = 0
    if sub.get("status") == "active" and expires_at_str:
        try:
            if expires_at_str.endswith("Z"):
                expires_at_str = expires_at_str[:-1] + "+00:00"
            exp = datetime.fromisoformat(expires_at_str)
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            delta = exp - datetime.now(timezone.utc)
            remaining_seconds = max(0, int(delta.total_seconds()))
        except Exception:
            remaining_seconds = 0
    res["subscription"]["remaining_seconds"] = remaining_seconds
    return res

@router.put("/me")
async def update_my_profile(
    payload: UserProfileUpdate,
    current_user: Dict[str, Any] = Depends(get_current_verified_user)
):
    update_data = {}
    now_iso = datetime.now(timezone.utc).isoformat()
    update_data["updated_at"] = now_iso

    if payload.name is not None and payload.name.strip():
        update_data["name"] = payload.name.strip()
    if payload.phone is not None:
        update_data["phone"] = payload.phone.strip()
    if payload.address is not None:
        update_data["address"] = payload.address.model_dump()

    await db_manager.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": update_data}
    )

    updated_user = await db_manager.users.find_one({"_id": current_user["_id"]})
    return {
        "status": "success",
        "message": "Profile updated successfully.",
        "user": format_user_response(updated_user)
    }

@router.post("/upload-avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_verified_user)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be an image (JPEG, PNG, WebP, etc.)."
        )

    file_bytes = await file.read()
    if len(file_bytes) > 5 * 1024 * 1024:  # 5MB limit
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile picture must be smaller than 5MB."
        )

    image_url, thumb_url = await upload_profile_image(file_bytes, file.filename)
    now_iso = datetime.now(timezone.utc).isoformat()

    await db_manager.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {
            "avatar": image_url,
            "avatar_thumb": thumb_url,
            "updated_at": now_iso
        }}
    )

    return {
        "status": "success",
        "message": "Profile picture uploaded successfully.",
        "avatar": image_url,
        "avatar_thumb": thumb_url
    }

@router.get("/download")
async def download_profile_pdf(current_user: Dict[str, Any] = Depends(get_current_verified_user)):
    """
    Requirement 4.3 Profile Download:
    Generates and returns a well-formatted PDF document containing user details, address, and membership.
    """
    user = await db_manager.users.find_one({"_id": current_user["_id"]})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40, leftMargin=40,
        topMargin=40, bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=6
    )
    subtitle_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.HexColor("#64748b"),
        spaceAfter=20
    )
    heading_style = ParagraphStyle(
        'DocHeading',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor("#0ea5e9"),
        spaceBefore=14,
        spaceAfter=8
    )
    normal_style = ParagraphStyle(
        'DocNormal',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor("#334155"),
        leading=14
    )

    story = []
    story.append(Paragraph("✨ AuraMart Member Profile", title_style))
    story.append(Paragraph(f"Exported on {datetime.now(timezone.utc).strftime('%B %d, %Y at %H:%M UTC')}", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0ea5e9"), spaceAfter=15))

    # Basic Info Table
    sub = user.get("subscription", {})
    addr = user.get("address", {})
    formatted_addr = addr.get("formatted_address") or "Not configured"
    
    info_data = [
        [Paragraph("<b>Full Name:</b>", normal_style), Paragraph(user.get("name", "N/A"), normal_style)],
        [Paragraph("<b>Email:</b>", normal_style), Paragraph(user.get("email", "N/A"), normal_style)],
        [Paragraph("<b>Account ID:</b>", normal_style), Paragraph(str(user.get("_id")), normal_style)],
        [Paragraph("<b>Account Status:</b>", normal_style), Paragraph("✅ Verified" if user.get("is_verified") else "❌ Unverified", normal_style)],
        [Paragraph("<b>Role:</b>", normal_style), Paragraph(user.get("role", "user").upper(), normal_style)],
        [Paragraph("<b>Phone:</b>", normal_style), Paragraph(user.get("phone") or "Not provided", normal_style)],
        [Paragraph("<b>Member Since:</b>", normal_style), Paragraph(user.get("created_at", "N/A")[:10], normal_style)],
    ]

    t_info = Table(info_data, colWidths=[140, 390])
    t_info.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(Paragraph("Personal Information", heading_style))
    story.append(t_info)

    # Subscription Table
    plan_name = sub.get("plan", "free").upper()
    plan_status = sub.get("status", "inactive").upper()
    expires_at = sub.get("expires_at", "Perpetual / No Expiry")
    duration = f"{sub.get('duration_hours')} Hours" if sub.get('duration_hours') else "Unlimited"

    sub_data = [
        [Paragraph("<b>Active Plan:</b>", normal_style), Paragraph(f"<b>{plan_name}</b>", normal_style)],
        [Paragraph("<b>Plan Status:</b>", normal_style), Paragraph(plan_status, normal_style)],
        [Paragraph("<b>Plan Duration:</b>", normal_style), Paragraph(duration, normal_style)],
        [Paragraph("<b>Expires At:</b>", normal_style), Paragraph(str(expires_at), normal_style)],
    ]

    t_sub = Table(sub_data, colWidths=[140, 390])
    t_sub.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f0fdf4" if plan_status == "ACTIVE" else "#fef2f2")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(Spacer(1, 10))
    story.append(Paragraph("Membership & Subscription", heading_style))
    story.append(t_sub)

    # Address Table
    addr_data = [
        [Paragraph("<b>Address:</b>", normal_style), Paragraph(formatted_addr, normal_style)],
        [Paragraph("<b>City / State:</b>", normal_style), Paragraph(f"{addr.get('city', '')} {addr.get('state', '')}", normal_style)],
        [Paragraph("<b>Postal Code / Country:</b>", normal_style), Paragraph(f"{addr.get('postal_code', '')} {addr.get('country', '')}", normal_style)],
        [Paragraph("<b>Geo Coordinates:</b>", normal_style), Paragraph(f"Lat: {addr.get('lat', 'N/A')}, Lng: {addr.get('lng', 'N/A')}", normal_style)],
    ]
    t_addr = Table(addr_data, colWidths=[140, 390])
    t_addr.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(Spacer(1, 10))
    story.append(Paragraph("Address & Location", heading_style))
    story.append(t_addr)

    # Build PDF
    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    filename = f"AuraMart_Profile_{user.get('name', 'User').replace(' ', '_')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
