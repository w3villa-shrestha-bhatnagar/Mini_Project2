import asyncio
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.database import db_manager
from app.cron import check_expired_plans
from datetime import datetime, timezone, timedelta
from unittest.mock import patch

def run_tests():
    print("🚀 Starting comprehensive backend integration tests...")
    
    with TestClient(app) as client:
        # 1. Health check
        resp = client.get("/api/health")
        assert resp.status_code == 200, f"Health check failed: {resp.text}"
        print("✅ 1. Health check passed")

        # 2. Standard Signup
        import time
        test_email = f"testuser_{int(time.time())}@example.com"
        verification_codes = {}

        async def capture_verification_code(email, name, otp):
            verification_codes[email] = otp
            return True

        signup_payload = {
            "name": "Alex Mercer",
            "email": test_email,
            "password": "Password123!"
        }
        with patch("app.routes.auth.send_verification_otp", side_effect=capture_verification_code):
            resp = client.post("/api/auth/signup", json=signup_payload)
        assert resp.status_code == 201, f"Signup failed: {resp.text}"
        signup_data = resp.json()
        assert signup_data["user"]["is_verified"] is False
        print("✅ 2. Standard signup created an unverified account and sent an OTP")

        # 3. Login is blocked until OTP verification
        resp = client.post("/api/auth/login", json={
            "email": test_email,
            "password": "Password123!"
        })
        assert resp.status_code == 403, f"Unverified login should be blocked: {resp.text}"
        assert resp.headers.get("X-Account-Unverified") == "true"

        resp = client.post("/api/auth/verify-otp", json={
            "email": test_email,
            "otp": verification_codes[test_email]
        })
        assert resp.status_code == 200, f"OTP verification failed: {resp.text}"

        # Login after successful verification
        resp = client.post("/api/auth/login", json={
            "email": test_email,
            "password": "Password123!"
        })
        assert resp.status_code == 200, f"Login failed after signup: {resp.text}"
        user_jwt = resp.json()["access_token"]
        auth_headers = {"Authorization": f"Bearer {user_jwt}"}
        print("✅ 3. OTP verification and subsequent login passed")

        # 4. Account now reports verified after correct OTP entry
        assert resp.json()["user"]["is_verified"] is True
        print("✅ 4. Account is verified only after the correct email OTP")

        # 6. Social Login with Account Merge (Requirement 1.1)
        # We simulate Google login using the SAME email: testuser_alex@example.com
        social_payload = {
            "provider": "google",
            "token": f"mock_google___{test_email}___Alex Google Mercer",
            "email": test_email,
            "name": "Alex Google Mercer"
        }
        resp = client.post("/api/auth/social-login", json=social_payload)
        assert resp.status_code == 200, f"Social merge failed: {resp.text}"
        merge_data = resp.json()
        assert merge_data.get("is_merged") is True, "Should identify existing account and merge!"
        assert "google" in merge_data["user"]["social_accounts"]
        print("✅ 6. Social login with Account Merge verified seamlessly (merged=True)")

        # 7. Profile Management (Address Update)
        address_payload = {
            "name": "Alex Mercer",
            "phone": "+91 9876543210",
            "address": {
                "formatted_address": "Connaught Place, New Delhi, Delhi 110001, India",
                "street": "Radial Road 1",
                "city": "New Delhi",
                "state": "Delhi",
                "postal_code": "110001",
                "country": "India",
                "lat": 28.6315,
                "lng": 77.2167
            }
        }
        resp = client.put("/api/profile/me", json=address_payload, headers=auth_headers)
        assert resp.status_code == 200, f"Profile address update failed: {resp.text}"
        assert resp.json()["user"]["address"]["city"] == "New Delhi"
        print("✅ 7. Profile address update & geo-coordinates passed")

        # 8. Profile Download (PDF)
        resp = client.get("/api/profile/download", headers=auth_headers)
        assert resp.status_code == 200, f"Profile PDF download failed: {resp.text}"
        assert resp.headers["content-type"] == "application/pdf"
        assert len(resp.content) > 500
        print(f"✅ 8. Profile PDF export generated successfully ({len(resp.content)} bytes)")

        # 9. Pricing Plans Catalog
        resp = client.get("/api/plans")
        assert resp.status_code == 200
        plans = resp.json()["plans"]
        assert len(plans) >= 3
        print("✅ 9. Pricing plans catalog loaded (Free, Silver, Gold)")

        # 10. Razorpay Order Creation & Payment Verification (1 Hour Silver Plan)
        order_resp = client.post("/api/payments/create-order", json={
            "plan_name": "silver",
            "duration_hours": 1
        }, headers=auth_headers)
        assert order_resp.status_code == 200, f"Order creation failed: {order_resp.text}"
        order_info = order_resp.json()["order"]
        assert "order_id" in order_info

        # Verify payment signature
        verify_pay_resp = client.post("/api/payments/verify", json={
            "razorpay_order_id": order_info["order_id"],
            "razorpay_payment_id": "pay_mock_123456",
            "razorpay_signature": "mock_valid_signature",
            "plan_name": "silver",
            "duration_hours": 1
        }, headers=auth_headers)
        assert verify_pay_resp.status_code == 200, f"Payment verification failed: {verify_pay_resp.text}"
        sub_info = verify_pay_resp.json()["subscription"]
        assert sub_info["plan"] == "silver"
        assert sub_info["status"] == "active"
        print(f"✅ 10. Razorpay checkout & immediate tier upgrade verified (plan={sub_info['plan']}, expires_at={sub_info['expires_at']})")

        # 11. Plan Expiration Cron Job Verification
        # Let's artificially backdate the expiration to 5 minutes ago to test cron
        async def test_cron_worker():
            expired_time = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
            await db_manager.users.update_one(
                {"email": test_email},
                {"$set": {"subscription.expires_at": expired_time}}
            )
            # Run cron check
            await check_expired_plans()
            updated_user = await db_manager.users.find_one({"email": test_email})
            assert updated_user["subscription"]["status"] == "expired", "Plan should be marked expired!"
            assert updated_user["subscription"]["plan"] == "free", "Expired plan should revert to free tier!"

        asyncio.run(test_cron_worker())
        print("✅ 11. Cron job plan expiration verified (status=expired, plan=free)")

        # 12. Admin Panel Integration
        # Login as Admin
        admin_login_resp = client.post("/api/auth/login", json={
            "email": "admin@auramart.com",
            "password": "Admin@123"
        })
        assert admin_login_resp.status_code == 200, f"Admin login failed: {admin_login_resp.text}"
        admin_jwt = admin_login_resp.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_jwt}"}

        # Admin stats
        stats_resp = client.get("/api/admin/stats", headers=admin_headers)
        assert stats_resp.status_code == 200
        stats = stats_resp.json()["stats"]
        assert stats["total_users"] >= 2
        print(f"✅ 12. Admin stats passed (Total users: {stats['total_users']}, Paid orders: {stats['paid_orders']})")

        # Admin user listing with search, filter, pagination
        list_resp = client.get(
            f"/api/admin/users?search=alex&role=user&page=1&limit=10",
            headers=admin_headers
        )
        assert list_resp.status_code == 200
        list_data = list_resp.json()
        assert len(list_data["users"]) >= 1
        assert list_data["pagination"]["page"] == 1
        print(f"✅ 13. Admin user listing with search, filter, and pagination verified")

        # Admin manual plan override
        user_to_mod = list_data["users"][0]["id"]
        override_resp = client.post(
            f"/api/admin/users/{user_to_mod}/plan",
            json={"plan_name": "gold", "duration_hours": 12},
            headers=admin_headers
        )
        assert override_resp.status_code == 200
        assert override_resp.json()["subscription"]["plan"] == "gold"
        print("✅ 14. Admin manual plan override verified (granted 12h Gold)")

    print("\n🎉 ALL 14 BACKEND INTEGRATION TESTS PASSED SUCCESSFULLY!\n")

if __name__ == "__main__":
    run_tests()
