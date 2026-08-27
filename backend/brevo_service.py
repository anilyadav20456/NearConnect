import os
import json
import urllib.request
import urllib.error
import threading
import logging

logger = logging.getLogger(__name__)

# Load .env file if present
env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(env_path):
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                os.environ.setdefault(key.strip(), val.strip())

BREVO_API_KEY = os.environ.get("BREVO_API_KEY", "")
BREVO_SENDER_NAME = os.environ.get("BREVO_SENDER_NAME", "NearConnect")
BREVO_SENDER_EMAIL = os.environ.get("BREVO_SENDER_EMAIL", "havenspace.marketplace@gmail.com")

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"
BREVO_ACCOUNT_URL = "https://api.brevo.com/v3/account"


def check_brevo_account():
    """
    Query Brevo Account API to check connection status and remaining credits.
    """
    if not BREVO_API_KEY:
        return {"status": "error", "message": "BREVO_API_KEY is missing."}

    req = urllib.request.Request(
        BREVO_ACCOUNT_URL,
        headers={
            "api-key": BREVO_API_KEY,
            "accept": "application/json"
        },
        method="GET"
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            credits = 0
            for p in data.get("plan", []):
                if p.get("creditsType") == "sendLimit":
                    credits = p.get("credits", 0)
            return {
                "status": "connected",
                "sender_name": BREVO_SENDER_NAME,
                "email": data.get("email"),
                "company": data.get("companyName"),
                "credits": credits,
                "relay_enabled": data.get("relay", {}).get("enabled", False)
            }
    except Exception as e:
        logger.error(f"Failed to check Brevo account: {e}")
        return {"status": "error", "message": str(e)}


def send_brevo_email(to_email, to_name, subject, html_content, text_content=None, async_send=True):
    """
    Sends a transactional email via Brevo REST API v3.
    Ensures sender is ALWAYS displayed as 'NearConnect'.
    """
    def _do_send():
        try:
            payload = {
                "sender": {
                    "name": BREVO_SENDER_NAME,
                    "email": BREVO_SENDER_EMAIL
                },
                "to": [
                    {
                        "email": to_email,
                        "name": to_name or "NearConnect User"
                    }
                ],
                "subject": subject,
                "htmlContent": html_content
            }
            if text_content:
                payload["textContent"] = text_content

            req_data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                BREVO_API_URL,
                data=req_data,
                headers={
                    "api-key": BREVO_API_KEY,
                    "content-type": "application/json",
                    "accept": "application/json"
                },
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                res_body = json.loads(resp.read().decode("utf-8"))
                logger.info(f"Brevo email sent to {to_email}. Message ID: {res_body.get('messageId')}")
                return {"success": True, "message_id": res_body.get("messageId")}
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            logger.error(f"Brevo API error ({e.code}): {err_body}")
            return {"success": False, "error": err_body}
        except Exception as e:
            logger.error(f"Failed to send Brevo email: {e}")
            return {"success": False, "error": str(e)}

    if async_send:
        t = threading.Thread(target=_do_send, daemon=True)
        t.start()
        return {"success": True, "status": "queued"}
    else:
        return _do_send()


# =========================================================
# HTML EMAIL TEMPLATES (PURE NEARCONNECT BRANDING)
# =========================================================

def _get_base_template(title, content_body):
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #0f172a;
            color: #f8fafc;
            margin: 0;
            padding: 0;
            line-height: 1.6;
        }}
        .container {{
            max-width: 600px;
            margin: 40px auto;
            background: #1e293b;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
            border: 1px solid #334155;
        }}
        .header {{
            background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);
            padding: 32px 24px;
            text-align: center;
        }}
        .header h1 {{
            margin: 0;
            color: #ffffff;
            font-size: 28px;
            font-weight: 800;
            letter-spacing: -0.5px;
        }}
        .header p {{
            margin: 6px 0 0 0;
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
        }}
        .content {{
            padding: 32px 28px;
            color: #e2e8f0;
        }}
        .badge {{
            display: inline-block;
            background: rgba(99, 102, 241, 0.2);
            color: #818cf8;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 16px;
            border: 1px solid rgba(99, 102, 241, 0.3);
        }}
        .otp-box {{
            background: #0f172a;
            border: 2px dashed #6366f1;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            margin: 24px 0;
        }}
        .otp-code {{
            font-size: 36px;
            font-weight: 800;
            letter-spacing: 8px;
            color: #38bdf8;
            margin: 0;
            font-family: 'Courier New', Courier, monospace;
        }}
        .btn {{
            display: inline-block;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 10px;
            font-weight: 700;
            font-size: 15px;
            margin-top: 16px;
            box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
        }}
        .footer {{
            background: #0f172a;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
            border-top: 1px solid #334155;
        }}
        .footer p {{
            margin: 4px 0;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>NearConnect</h1>
            <p>Connect with people near you</p>
        </div>
        <div class="content">
            {content_body}
        </div>
        <div class="footer">
            <p><strong>NearConnect Platform</strong></p>
            <p>You received this message from NearConnect. Please do not reply directly to this automated email.</p>
            <p>&copy; 2026 NearConnect. All rights reserved.</p>
        </div>
    </div>
</body>
</html>"""


def send_registration_otp_email(to_email, user_name, otp):
    """
    Sends a 6-digit OTP code for registration email verification from NearConnect.
    """
    subject = "NearConnect - Verify Your Email Address"
    body = f"""
        <div class="badge">Email Verification</div>
        <h2 style="color: #ffffff; margin-top: 0;">Hi {user_name},</h2>
        <p>Thank you for signing up for <strong>NearConnect</strong>! To complete your registration and create your account, please enter the 6-digit verification code below:</p>
        
        <div class="otp-box">
            <div class="otp-code">{otp}</div>
            <p style="font-size: 12px; color: #94a3b8; margin: 8px 0 0 0;">Valid for 15 minutes</p>
        </div>

        <p style="font-size: 13px; color: #cbd5e1;">If you did not request this verification code, please ignore this email.</p>
        <p style="margin-top: 25px; font-size: 14px; color: #94a3b8;">
            Welcome to the community,<br>
            <strong>The NearConnect Team</strong>
        </p>
    """
    html_content = _get_base_template("Verify Your NearConnect Account", body)
    text_content = f"Hi {user_name},\n\nYour NearConnect email verification code is: {otp}\nThis code is valid for 15 minutes.\n\nBest regards,\nThe NearConnect Team"
    return send_brevo_email(to_email, user_name, subject, html_content, text_content)


def send_welcome_email(to_email, user_name):
    """
    Sends a branded NearConnect Welcome Email upon registration.
    """
    subject = "Welcome to NearConnect! 🎉"
    body = f"""
        <div class="badge">Welcome Onboard</div>
        <h2 style="color: #ffffff; margin-top: 0;">Hi {user_name},</h2>
        <p>Welcome to <strong>NearConnect</strong>! We are thrilled to have you join our community.</p>
        <p>With NearConnect, you can discover people nearby, share updates, send messages, and build real local connections in real time.</p>
        <p style="text-align: center; margin-top: 30px;">
            <a href="https://nearconnect-frontend.onrender.com" class="btn">Explore NearConnect</a>
        </p>
        <p style="margin-top: 30px; font-size: 14px; color: #94a3b8;">
            Best regards,<br>
            <strong>The NearConnect Team</strong>
        </p>
    """
    html_content = _get_base_template("Welcome to NearConnect", body)
    text_content = f"Hi {user_name},\n\nWelcome to NearConnect! We are thrilled to have you join our community.\n\nBest regards,\nThe NearConnect Team"
    return send_brevo_email(to_email, user_name, subject, html_content, text_content)


def send_password_reset_email(to_email, user_name, reset_otp):
    """
    Sends a 6-digit OTP code for password reset from NearConnect.
    """
    subject = "NearConnect - Password Reset OTP Code"
    body = f"""
        <div class="badge">Security Verification</div>
        <h2 style="color: #ffffff; margin-top: 0;">Hello {user_name},</h2>
        <p>We received a request to reset your password for your <strong>NearConnect</strong> account.</p>
        <p>Use the 6-digit OTP verification code below to proceed with resetting your password:</p>
        
        <div class="otp-box">
            <div class="otp-code">{reset_otp}</div>
            <p style="font-size: 12px; color: #94a3b8; margin: 8px 0 0 0;">Valid for 15 minutes</p>
        </div>

        <p style="font-size: 13px; color: #cbd5e1;">If you did not request a password reset, please ignore this email or secure your account.</p>
        <p style="margin-top: 25px; font-size: 14px; color: #94a3b8;">
            Best regards,<br>
            <strong>NearConnect Security Team</strong>
        </p>
    """
    html_content = _get_base_template("NearConnect Password Reset", body)
    text_content = f"Hello {user_name},\n\nYour NearConnect password reset OTP code is: {reset_otp}\nThis code is valid for 15 minutes.\n\nBest regards,\nNearConnect Security Team"
    return send_brevo_email(to_email, user_name, subject, html_content, text_content)


def send_message_notification_email(to_email, recipient_name, sender_name, message_preview):
    """
    Sends an email notification when a user receives a new message while offline.
    """
    subject = f"NearConnect - New message from {sender_name}"
    body = f"""
        <div class="badge">New Message</div>
        <h2 style="color: #ffffff; margin-top: 0;">Hi {recipient_name},</h2>
        <p>You received a new message from <strong>{sender_name}</strong> on <strong>NearConnect</strong>:</p>
        
        <div style="background: #0f172a; border-left: 4px solid #a855f7; padding: 16px; border-radius: 8px; margin: 20px 0; font-style: italic; color: #f1f5f9;">
            "{message_preview}"
        </div>

        <p style="text-align: center; margin-top: 24px;">
            <a href="https://nearconnect-frontend.onrender.com" class="btn">Reply on NearConnect</a>
        </p>
        <p style="margin-top: 25px; font-size: 14px; color: #94a3b8;">
            Best regards,<br>
            <strong>The NearConnect Team</strong>
        </p>
    """
    html_content = _get_base_template(f"New Message from {sender_name}", body)
    text_content = f"Hi {recipient_name},\n\nYou received a new message from {sender_name} on NearConnect:\n\"{message_preview}\"\n\nReply at https://nearconnect-frontend.onrender.com\n\nBest regards,\nThe NearConnect Team"
    return send_brevo_email(to_email, recipient_name, subject, html_content, text_content)
