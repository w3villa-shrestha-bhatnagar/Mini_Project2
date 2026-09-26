from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any, List

class UserSignup(BaseModel):
    name: str = Field(..., min_length=2)
    email: EmailStr
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class SocialLogin(BaseModel):
    provider: str  # 'google' or 'facebook'
    token: str
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    avatar: Optional[str] = None

class VerifyEmailRequest(BaseModel):
    token: str

class ResendVerificationRequest(BaseModel):
    email: EmailStr

class AddressModel(BaseModel):
    formatted_address: Optional[str] = None
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[AddressModel] = None

class CreateOrderRequest(BaseModel):
    plan_name: str  # 'silver' or 'gold'
    duration_hours: int  # 1, 6, or 12

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan_name: str
    duration_hours: int

class AdminUpdateRoleRequest(BaseModel):
    role: str  # 'user' or 'admin'

class AdminUpdateVerifyRequest(BaseModel):
    is_verified: bool

class AdminManualPlanRequest(BaseModel):
    plan_name: str  # 'free', 'silver', 'gold'
    duration_hours: int  # 1, 6, 12 or 0 for free
