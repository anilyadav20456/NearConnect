import os
import math
import uuid
from functools import wraps
from datetime import datetime, timedelta

import jwt

from flask import (
    Flask,
    request,
    jsonify,
    send_from_directory
)

from flask_cors import CORS

from flask_socketio import (
    SocketIO,
    emit,
    join_room,
    leave_room
)

from werkzeug.security import (
    generate_password_hash,
    check_password_hash
)

from werkzeug.utils import secure_filename

from sqlalchemy import text

import random
from brevo_service import (
    check_brevo_account,
    send_brevo_email,
    send_registration_otp_email,
    send_welcome_email,
    send_password_reset_email,
    send_message_notification_email
)

from models import (
    db,
    User,
    FriendRequest,
    Message,
    Notification,
    Block,
    Report
)


# =========================================================
# APP CONFIG
# =========================================================

BASE_DIR = os.path.abspath(
    os.path.dirname(__file__)
)

INSTANCE_DIR = os.path.join(
    BASE_DIR,
    "instance"
)

UPLOAD_DIR = os.path.join(
    INSTANCE_DIR,
    "uploads",
    "profile"
)

os.makedirs(
    INSTANCE_DIR,
    exist_ok=True
)

os.makedirs(
    UPLOAD_DIR,
    exist_ok=True
)


app = Flask(__name__)

app.config["SECRET_KEY"] = os.environ.get(
    "SECRET_KEY",
    "nearconnect-development-secret-key-change-before-production"
)

app.config["JWT_SECRET_KEY"] = os.environ.get(
    "JWT_SECRET_KEY",
    "nearconnect-jwt-secret-key-change-before-production"
)

app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
    "DATABASE_URL",
    "sqlite:///nearconnect.db"
)

app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

app.config["MAX_CONTENT_LENGTH"] = (
    5 * 1024 * 1024
)

app.config["UPLOAD_FOLDER"] = UPLOAD_DIR


cors_origins_env = os.environ.get("CORS_ORIGINS", "*")
if cors_origins_env == "*":
    allowed_origins = "*"
else:
    allowed_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]

CORS(
    app,
    resources={
        r"/*": {
            "origins": allowed_origins
        }
    },
    supports_credentials=True
)


# =========================================================
# SOCKET.IO
# =========================================================

socketio = SocketIO(
    app,
    cors_allowed_origins=allowed_origins,
    async_mode="threading",
    logger=False,
    engineio_logger=False
)


# =========================================================
# DATABASE
# =========================================================

db.init_app(app)


# =========================================================
# GLOBAL SOCKET USER MAP
# =========================================================

connected_users = {}

# user_id -> set(socket_id)

pending_registrations = {}
# email -> { name, username, email, password, otp, expires_at }


# =========================================================
# HELPERS
# =========================================================

ALLOWED_IMAGE_EXTENSIONS = {
    "jpg",
    "jpeg",
    "png",
    "webp"
}

ALLOWED_IMAGE_MIMES = {
    "image/jpeg",
    "image/png",
    "image/webp"
}


def json_error(
    message,
    status=400
):
    return jsonify({
        "error": message
    }), status


def get_token_from_request():
    auth_header = request.headers.get(
        "Authorization",
        ""
    )

    if not auth_header:
        return None

    if not auth_header.startswith(
        "Bearer "
    ):
        return None

    return auth_header.split(
        " ",
        1
    )[1].strip()


def decode_token(
    token
):
    try:

        payload = jwt.decode(
            token,
            app.config["JWT_SECRET_KEY"],
            algorithms=["HS256"]
        )

        return payload

    except Exception:

        return None


def get_current_user():

    token = get_token_from_request()

    if not token:
        return None

    payload = decode_token(
        token
    )

    if not payload:
        return None

    user_id = payload.get(
        "user_id"
    )

    if not user_id:
        return None

    return db.session.get(
        User,
        int(user_id)
    )


def token_required(
    function
):

    @wraps(function)
    def wrapper(
        *args,
        **kwargs
    ):

        user = get_current_user()

        if not user:

            return json_error(
                "Invalid or missing authentication token.",
                401
            )

        return function(
            user,
            *args,
            **kwargs
        )

    return wrapper


def create_token(
    user
):

    now = datetime.utcnow()

    payload = {
        "user_id": user.id,
        "username": user.username,
        "iat": now,
        "exp": now + timedelta(
            days=7
        )
    }

    return jwt.encode(
        payload,
        app.config["JWT_SECRET_KEY"],
        algorithm="HS256"
    )


def serialize_user(
    user,
    include_private=False
):

    if not user:
        return None

    data = {
        "id": user.id,
        "name": user.name,
        "username": user.username,
        "bio": user.bio or "",
        "profession": user.profession or "",
        "interests": user.interests or "",
        "profile_image": user.profile_image or "",
        "date_of_birth": (
            user.date_of_birth.isoformat()
            if user.date_of_birth
            else None
        ),
        "latitude": user.latitude,
        "longitude": user.longitude,
        "is_discoverable": bool(
            user.is_discoverable
        ),
        "is_online": bool(
            user.is_online
        ),
        "show_online_status": bool(
            user.show_online_status
        ),
        "language": user.language or "en",
        "default_radius": int(
            user.default_radius or 2
        )
    }

    if include_private:

        data["email"] = user.email

    return data


def serialize_message(
    message
):

    return {
        "id": message.id,
        "sender_id": message.sender_id,
        "receiver_id": message.receiver_id,
        "content": message.content,
        "is_read": bool(
            message.is_read
        ),
        "is_edited": bool(
            getattr(message, "is_edited", False)
        ),
        "is_deleted": bool(
            getattr(message, "is_deleted", False)
        ),
        "is_pinned": bool(
            getattr(message, "is_pinned", False)
        ),
        "created_at": (
            (message.created_at.isoformat() + "Z")
            if message.created_at
            else None
        ),
        "sender": serialize_user(
            message.sender
        ),
        "receiver": serialize_user(
            message.receiver
        )
    }


def serialize_notification(
    notification
):

    return {
        "id": notification.id,
        "user_id": notification.user_id,
        "type": notification.type,
        "title": notification.title,
        "message": notification.message,
        "related_user_id": notification.related_user_id,
        "related_message_id": notification.related_message_id,
        "is_read": bool(
            notification.is_read
        ),
        "created_at": (
            (notification.created_at.isoformat() + "Z")
            if notification.created_at
            else None
        )
    }


def room_name(
    user_a,
    user_b
):

    first = min(
        int(user_a),
        int(user_b)
    )

    second = max(
        int(user_a),
        int(user_b)
    )

    return (
        f"chat_{first}_{second}"
    )


def user_room(
    user_id
):

    return f"user_{int(user_id)}"


def are_blocked(
    user_a_id,
    user_b_id
):

    blocked = Block.query.filter(
        (
            (Block.blocker_id == user_a_id)
            &
            (Block.blocked_id == user_b_id)
        )
        |
        (
            (Block.blocker_id == user_b_id)
            &
            (Block.blocked_id == user_a_id)
        )
    ).first()

    return blocked is not None


def are_friends(
    user_a_id,
    user_b_id
):

    request_row = FriendRequest.query.filter(
        FriendRequest.status == "accepted"
    ).filter(
        (
            (FriendRequest.sender_id == user_a_id)
            &
            (FriendRequest.receiver_id == user_b_id)
        )
        |
        (
            (FriendRequest.sender_id == user_b_id)
            &
            (FriendRequest.receiver_id == user_a_id)
        )
    ).first()

    return request_row is not None


def get_friendship_status(
    user_a_id,
    user_b_id
):
    request_row = FriendRequest.query.filter(
        (
            (FriendRequest.sender_id == user_a_id)
            &
            (FriendRequest.receiver_id == user_b_id)
        )
        |
        (
            (FriendRequest.sender_id == user_b_id)
            &
            (FriendRequest.receiver_id == user_a_id)
        )
    ).order_by(FriendRequest.created_at.desc()).first()

    if not request_row:
        return "none"
    if request_row.status == "accepted":
        return "accepted"
    if request_row.status == "pending":
        if request_row.sender_id == user_a_id:
            return "pending_sent"
        else:
            return "pending_received"
    return "none"


def notify_user(
    user_id,
    notification_type,
    title,
    message,
    related_user_id=None,
    related_message_id=None
):

    notification = Notification(
        user_id=user_id,
        type=notification_type,
        title=title,
        message=message,
        related_user_id=related_user_id,
        related_message_id=related_message_id,
        is_read=False
    )

    db.session.add(
        notification
    )

    db.session.commit()

    socketio.emit(
        "system_notification",
        {
            **serialize_notification(
                notification
            )
        },
        room=user_room(
            user_id
        )
    )

    return notification


def emit_to_user(
    user_id,
    event_name,
    payload
):

    socketio.emit(
        event_name,
        payload,
        room=user_room(
            user_id
        )
    )


def allowed_radius(
    radius
):

    try:
        value = int(
            radius
        )
    except Exception:
        return None

    if value not in {
        2,
        4,
        5
    }:
        return None

    return value


def haversine_km(
    lat1,
    lon1,
    lat2,
    lon2
):

    radius = 6371.0

    phi1 = math.radians(
        lat1
    )

    phi2 = math.radians(
        lat2
    )

    d_phi = math.radians(
        lat2 - lat1
    )

    d_lambda = math.radians(
        lon2 - lon1
    )

    a = (
        math.sin(
            d_phi / 2
        ) ** 2
        +
        math.cos(phi1)
        *
        math.cos(phi2)
        *
        math.sin(
            d_lambda / 2
        ) ** 2
    )

    c = 2 * math.atan2(
        math.sqrt(a),
        math.sqrt(1 - a)
    )

    return radius * c


def image_extension(
    filename
):

    extension = (
        filename.rsplit(
            ".",
            1
        )[1]
        .lower()
        if "." in filename
        else ""
    )

    return extension


def image_url(
    image_name
):

    if not image_name:
        return ""

    if image_name.startswith(
        "http://"
    ) or image_name.startswith(
        "https://"
    ):
        return image_name

    return (
        f"/media/profile/{image_name}"
    )


# =========================================================
# DATABASE MIGRATION
# =========================================================

def ensure_database():

    with app.app_context():

        db.create_all()

        inspector_columns = []

        result = db.session.execute(
            text(
                "PRAGMA table_info(users)"
            )
        )

        for row in result.fetchall():

            inspector_columns.append(
                row[1]
            )

        migrations = {

            "profile_image":
                "ALTER TABLE users "
                "ADD COLUMN profile_image "
                "VARCHAR(500) DEFAULT ''",

            "show_online_status":
                "ALTER TABLE users "
                "ADD COLUMN show_online_status "
                "BOOLEAN DEFAULT 1",

            "language":
                "ALTER TABLE users "
                "ADD COLUMN language "
                "VARCHAR(10) DEFAULT 'en'",

            "default_radius":
                "ALTER TABLE users "
                "ADD COLUMN default_radius "
                "INTEGER DEFAULT 2"

        }

        for column_name, sql in migrations.items():

            if column_name not in inspector_columns:

                db.session.execute(
                    text(sql)
                )

        db.session.commit()

        print(
            "--------------------------------"
        )

        print(
            "DATABASE CREATED / VERIFIED"
        )

        print(
            "--------------------------------"
        )


# =========================================================
# HEALTH
# =========================================================

@app.get(
    "/api/health"
)
def health():

    return jsonify({
        "status": "ok",
        "service": "NearConnect",
        "socketio": True
    })


# =========================================================
# AUTH - SEND REGISTRATION OTP
# =========================================================

@app.post(
    "/api/auth/send-registration-otp"
)
def send_registration_otp():
    try:
        data = request.get_json(silent=True) or {}
        name = (data.get("name") or "").strip()
        username = (data.get("username") or "").strip().lower()
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""

        if not name:
            return json_error("Name is required.")
        if not username:
            return json_error("Username is required.")
        if not email:
            return json_error("Email is required.")
        if len(password) < 6:
            return json_error("Password must be at least 6 characters.")

        if User.query.filter_by(username=username).first():
            return json_error("Username already exists.", 409)

        if User.query.filter_by(email=email).first():
            return json_error("Email already exists.", 409)

        otp = f"{random.randint(100000, 999999)}"
        expires_at = datetime.utcnow() + timedelta(minutes=15)

        pending_registrations[email] = {
            "name": name,
            "username": username,
            "email": email,
            "password": password,
            "otp": otp,
            "expires_at": expires_at
        }

        # Send email OTP via Brevo NearConnect
        send_registration_otp_email(email, name, otp)

        return jsonify({
            "message": f"Verification code sent to {email}.",
            "email": email
        })

    except Exception as error:
        print("SEND REGISTRATION OTP ERROR:", error)
        return json_error("Unable to send verification email.", 500)


@app.post(
    "/api/auth/verify-registration-otp"
)
def verify_registration_otp():
    try:
        data = request.get_json(silent=True) or {}
        email = (data.get("email") or "").strip().lower()
        otp = (data.get("otp") or "").strip()

        if not email or not otp:
            return json_error("Email and OTP code are required.")

        pending_user = pending_registrations.get(email)
        if not pending_user:
            return json_error("No pending registration found. Please register again.", 404)

        if pending_user["otp"] != otp:
            return json_error("Invalid verification code. Please check your email.", 400)

        if datetime.utcnow() > pending_user["expires_at"]:
            return json_error("Verification code has expired. Please click resend.", 400)

        # Create user account after successful verification
        user = User(
            name=pending_user["name"],
            username=pending_user["username"],
            email=pending_user["email"],
            password=generate_password_hash(pending_user["password"]),
            bio="",
            profession="",
            interests="",
            profile_image="",
            is_discoverable=True,
            is_online=False,
            show_online_status=True,
            language="en",
            default_radius=2
        )

        db.session.add(user)
        db.session.commit()

        # Send welcome email from NearConnect
        try:
            send_welcome_email(user.email, user.name)
        except Exception as e:
            print("Welcome email error:", e)

        # Clear pending registration
        pending_registrations.pop(email, None)

        token = create_token(user)

        return jsonify({
            "message": "Email verified! Account created successfully.",
            "token": token,
            "user": serialize_user(user, include_private=True)
        }), 201

    except Exception as error:
        db.session.rollback()
        print("VERIFY REGISTRATION OTP ERROR:", error)
        return json_error("Unable to complete account verification.", 500)


# =========================================================
# AUTH - REGISTER (DIRECT)
# =========================================================

@app.post(
    "/api/auth/register"
)
def register():

    try:

        data = request.get_json(
            silent=True
        ) or {}

        name = (
            data.get(
                "name"
            )
            or ""
        ).strip()

        username = (
            data.get(
                "username"
            )
            or ""
        ).strip().lower()

        email = (
            data.get(
                "email"
            )
            or ""
        ).strip().lower()

        password = (
            data.get(
                "password"
            )
            or ""
        )


        if not name:
            return json_error(
                "Name is required."
            )

        if not username:
            return json_error(
                "Username is required."
            )

        if not email:
            return json_error(
                "Email is required."
            )

        if len(password) < 6:
            return json_error(
                "Password must be at least 6 characters."
            )


        if User.query.filter_by(
            username=username
        ).first():

            return json_error(
                "Username already exists.",
                409
            )


        if User.query.filter_by(
            email=email
        ).first():

            return json_error(
                "Email already exists.",
                409
            )


        user = User(
            name=name,
            username=username,
            email=email,
            password=generate_password_hash(
                password
            ),
            bio="",
            profession="",
            interests="",
            profile_image="",
            is_discoverable=True,
            is_online=False,
            show_online_status=True,
            language="en",
            default_radius=2
        )


        db.session.add(
            user
        )

        db.session.commit()

        # Send welcome email from NearConnect
        try:
            send_welcome_email(user.email, user.name)
        except Exception as e:
            print("Welcome email error:", e)

        token = create_token(
            user
        )


        return jsonify({

            "message":
                "Registration successful.",

            "token":
                token,

            "user":
                serialize_user(
                    user,
                    include_private=True
                )

        }), 201


    except Exception as error:

        db.session.rollback()

        print(
            "REGISTER ERROR:",
            error
        )

        return json_error(
            "Unable to create account.",
            500
        )


# =========================================================
# AUTH - LOGIN
# =========================================================

@app.post(
    "/api/auth/login"
)
def login():

    try:

        data = request.get_json(
            silent=True
        ) or {}


        user_identifier = (
            data.get("username") or data.get("email") or ""
        ).strip().lower()

        password = (
            data.get("password") or ""
        )

        if not user_identifier or not password:
            return json_error(
                "Username/Email and password are required.",
                400
            )

        user = User.query.filter(
            (db.func.lower(User.username) == user_identifier) |
            (db.func.lower(User.email) == user_identifier)
        ).first()

        if not user:
            return json_error(
                "Invalid username or password.",
                401
            )


        if not check_password_hash(
            user.password,
            password
        ):

            return json_error(
                "Invalid username or password.",
                401
            )


        user.is_online = True

        db.session.commit()


        token = create_token(
            user
        )


        emit_to_user(
            user.id,
            "user_online",
            {
                "user_id":
                    user.id
            }
        )


        return jsonify({

            "message":
                "Login successful.",

            "token":
                token,

            "user":
                serialize_user(
                    user,
                    include_private=True
                )

        })


    except Exception as error:

        db.session.rollback()

        print(
            "LOGIN ERROR:",
            error
        )

        return json_error(
            "Unable to login. Please try again.",
            500
        )


# =========================================================
# AUTH - LOGOUT
# =========================================================

@app.post(
    "/api/auth/logout"
)
@token_required
def logout(
    current_user
):

    try:

        current_user.is_online = False

        db.session.commit()


        emit_to_user(
            current_user.id,
            "user_offline",
            {
                "user_id":
                    current_user.id
            }
        )


        return jsonify({
            "message":
                "Logged out successfully."
        })


    except Exception as error:

        db.session.rollback()

        print(
            "LOGOUT ERROR:",
            error
        )

        return json_error(
            "Unable to logout.",
            500
        )


# =========================================================
# CHANGE PASSWORD
# =========================================================

@app.put(
    "/api/auth/change-password"
)
@token_required
def change_password(
    current_user
):

    try:

        data = request.get_json(
            silent=True
        ) or {}

        current_password = (
            data.get(
                "current_password"
            )
            or ""
        )

        new_password = (
            data.get(
                "new_password"
            )
            or ""
        )


        if not current_password:

            return json_error(
                "Current password is required."
            )


        if len(new_password) < 6:

            return json_error(
                "New password must be at least 6 characters."
            )


        if not check_password_hash(
            current_user.password,
            current_password
        ):

            return json_error(
                "Current password is incorrect.",
                401
            )


        current_user.password = (
            generate_password_hash(
                new_password
            )
        )

        db.session.commit()


        return jsonify({
            "message":
                "Password changed successfully."
        })


    except Exception as error:

        db.session.rollback()

        print(
            "CHANGE PASSWORD ERROR:",
            error
        )

        return json_error(
            "Unable to change password.",
            500
        )


# =========================================================
# PROFILE - GET
# =========================================================

@app.get(
    "/api/users/profile"
)
@token_required
def get_profile(
    current_user
):

    return jsonify({
        "user":
            serialize_user(
                current_user,
                include_private=True
            )
    })


# =========================================================
# PROFILE - UPDATE
# =========================================================

@app.put(
    "/api/users/profile"
)
@token_required
def update_profile(
    current_user
):

    try:

        data = request.get_json(
            silent=True
        ) or {}


        if "name" in data:

            name = str(
                data.get(
                    "name"
                )
                or ""
            ).strip()

            if name:

                current_user.name = (
                    name[:100]
                )


        if "bio" in data:

            current_user.bio = (
                str(
                    data.get(
                        "bio"
                    )
                    or ""
                )[:500]
            )


        if "profession" in data:

            current_user.profession = (
                str(
                    data.get(
                        "profession"
                    )
                    or ""
                )[:100]
            )


        if "interests" in data:

            current_user.interests = (
                str(
                    data.get(
                        "interests"
                    )
                    or ""
                )[:500]
            )


        if "date_of_birth" in data:

            dob = data.get(
                "date_of_birth"
            )

            if dob:

                try:

                    current_user.date_of_birth = (
                        datetime.strptime(
                            dob,
                            "%Y-%m-%d"
                        ).date()
                    )

                except ValueError:

                    return json_error(
                        "Invalid date of birth."
                    )

            else:

                current_user.date_of_birth = None


        if "is_discoverable" in data:

            current_user.is_discoverable = bool(
                data.get(
                    "is_discoverable"
                )
            )


        if "show_online_status" in data:

            current_user.show_online_status = bool(
                data.get(
                    "show_online_status"
                )
            )


        if "language" in data:

            language = str(
                data.get(
                    "language"
                )
                or "en"
            ).lower()

            if language not in {
                "en",
                "te"
            }:

                return json_error(
                    "Unsupported language."
                )

            current_user.language = language


        if "default_radius" in data:

            radius = allowed_radius(
                data.get(
                    "default_radius"
                )
            )

            if radius is None:

                return json_error(
                    "Radius must be 2, 4 or 5 KM."
                )

            current_user.default_radius = (
                radius
            )


        current_user.updated_at = (
            datetime.utcnow()
        )

        db.session.commit()


        return jsonify({
            "message":
                "Profile updated successfully.",

            "user":
                serialize_user(
                    current_user,
                    include_private=True
                )
        })


    except Exception as error:

        db.session.rollback()

        print(
            "PROFILE UPDATE ERROR:",
            error
        )

        return json_error(
            "Unable to update profile.",
            500
        )


# =========================================================
# PROFILE IMAGE UPLOAD
# =========================================================

@app.post(
    "/api/users/profile/image"
)
@token_required
def upload_profile_image(
    current_user
):

    try:

        if "image" not in request.files:

            return json_error(
                "No image was uploaded."
            )


        file = request.files[
            "image"
        ]


        if not file or not file.filename:

            return json_error(
                "Please select an image."
            )


        if file.mimetype not in (
            ALLOWED_IMAGE_MIMES
        ):

            return json_error(
                "Only JPG, PNG and WEBP images are allowed."
            )


        extension = image_extension(
            file.filename
        )


        if extension not in (
            ALLOWED_IMAGE_EXTENSIONS
        ):

            return json_error(
                "Unsupported image format."
            )


        safe_original_name = secure_filename(
            file.filename
        )


        if not safe_original_name:

            return json_error(
                "Invalid filename."
            )


        unique_name = (
            f"{uuid.uuid4().hex}."
            f"{extension}"
        )


        target_path = os.path.join(
            app.config["UPLOAD_FOLDER"],
            unique_name
        )


        file.save(
            target_path
        )


        # Remove old image
        old_image = (
            current_user.profile_image
            or ""
        )


        if old_image:

            old_filename = (
                os.path.basename(
                    old_image
                )
            )

            old_path = os.path.join(
                app.config["UPLOAD_FOLDER"],
                old_filename
            )

            if (
                os.path.exists(
                    old_path
                )
                and
                os.path.isfile(
                    old_path
                )
            ):

                try:
                    os.remove(
                        old_path
                    )
                except OSError:
                    pass


        current_user.profile_image = (
            unique_name
        )

        current_user.updated_at = (
            datetime.utcnow()
        )

        db.session.commit()


        return jsonify({

            "message":
                "Profile photo updated successfully.",

            "profile_image":
                unique_name,

            "user":
                serialize_user(
                    current_user,
                    include_private=True
                )

        })


    except Exception as error:

        db.session.rollback()

        print(
            "PROFILE IMAGE ERROR:",
            error
        )

        return json_error(
            "Unable to upload profile image.",
            500
        )


# =========================================================
# SERVE PROFILE IMAGES
# =========================================================

@app.get(
    "/media/profile/<path:filename>"
)
def serve_profile_image(
    filename
):

    return send_from_directory(
        app.config[
            "UPLOAD_FOLDER"
        ],
        filename
    )


# =========================================================
# LOCATION UPDATE
# =========================================================

@app.post(
    "/api/users/location"
)
@token_required
def update_location(
    current_user
):

    try:

        data = request.get_json(
            silent=True
        ) or {}


        latitude = data.get(
            "latitude"
        )

        longitude = data.get(
            "longitude"
        )


        if latitude is None or longitude is None:

            return json_error(
                "Latitude and longitude are required."
            )


        latitude = float(
            latitude
        )

        longitude = float(
            longitude
        )


        if not (
            -90 <= latitude <= 90
        ):

            return json_error(
                "Invalid latitude."
            )


        if not (
            -180 <= longitude <= 180
        ):

            return json_error(
                "Invalid longitude."
            )


        current_user.latitude = (
            latitude
        )

        current_user.longitude = (
            longitude
        )

        current_user.is_online = True

        db.session.commit()


        print(
            "--------------------------------"
        )

        print(
            "LOCATION UPDATED"
        )

        print(
            "User ID:",
            current_user.id
        )

        print(
            "Latitude:",
            latitude
        )

        print(
            "Longitude:",
            longitude
        )

        print(
            "--------------------------------"
        )


        return jsonify({
            "message":
                "Location updated successfully.",

            "latitude":
                latitude,

            "longitude":
                longitude
        })


    except Exception as error:

        db.session.rollback()

        print(
            "LOCATION ERROR:",
            error
        )

        return json_error(
            "Unable to update location.",
            500
        )


# =========================================================
# NEARBY USERS
# =========================================================

@app.get(
    "/api/users/nearby"
)
@token_required
def nearby_users(
    current_user
):

    radius = allowed_radius(
        request.args.get(
            "radius",
            current_user.default_radius or 2
        )
    )


    if radius is None:

        return json_error(
            "Radius must be 2, 4 or 5 KM."
        )


    if (
        current_user.latitude is None
        or
        current_user.longitude is None
    ):

        return jsonify({

            "users": [],

            "message":
                "Location is required."

        })


    blocked_ids = {
        current_user.id
    }


    blocked_rows = Block.query.filter(
        (
            Block.blocker_id ==
            current_user.id
        )
        |
        (
            Block.blocked_id ==
            current_user.id
        )
    ).all()


    for row in blocked_rows:

        blocked_ids.add(
            row.blocker_id
        )

        blocked_ids.add(
            row.blocked_id
        )


    users = User.query.filter(
        User.id.notin_(
            blocked_ids
        )
    ).filter(
        User.is_discoverable.is_(True)
    ).all()


    results = []


    for user in users:

        if (
            user.latitude is None
            or
            user.longitude is None
        ):
            continue


        distance = haversine_km(
            current_user.latitude,
            current_user.longitude,
            user.latitude,
            user.longitude
        )


        if distance <= radius:

            item = serialize_user(
                user
            )

            item["distance"] = round(
                distance,
                2
            )


            item["is_friend"] = (
                get_friendship_status(current_user.id, user.id) == "accepted"
            )

            item["friendship_status"] = get_friendship_status(
                current_user.id,
                user.id
            )

            if not user.show_online_status:

                item["is_online"] = False


            results.append(
                item
            )


    results.sort(
        key=lambda item:
            item.get(
                "distance",
                999999
            )
    )


    print(
        "--------------------------------"
    )

    print(
        "NEARBY USERS"
    )

    print(
        "Current User:",
        current_user.username
    )

    print(
        "Radius:",
        radius
    )

    print(
        "Users Found:",
        len(results)
    )

    print(
        "--------------------------------"
    )


    return jsonify({

        "users":
            results,

        "radius":
            radius,

        "count":
            len(results)

    })


# =========================================================
# FRIENDS
# =========================================================

@app.get(
    "/api/friends"
)
@token_required
def get_friends(
    current_user
):

    rows = FriendRequest.query.filter(
        FriendRequest.status == "accepted"
    ).filter(
        (
            FriendRequest.sender_id ==
            current_user.id
        )
        |
        (
            FriendRequest.receiver_id ==
            current_user.id
        )
    ).all()


    result = []


    for row in rows:

        friend_id = (
            row.receiver_id
            if row.sender_id ==
            current_user.id
            else
            row.sender_id
        )


        if are_blocked(
            current_user.id,
            friend_id
        ):

            continue


        friend = db.session.get(
            User,
            friend_id
        )


        if not friend:
            continue


        result.append(
            serialize_user(
                friend
            )
        )


    return jsonify({
        "friends":
            result
    })


# =========================================================
# FRIEND REQUESTS - RECEIVED
# =========================================================

@app.get(
    "/api/friends/requests"
)
@token_required
def get_friend_requests(
    current_user
):

    rows = FriendRequest.query.filter(
        FriendRequest.receiver_id ==
        current_user.id
    ).filter(
        FriendRequest.status ==
        "pending"
    ).order_by(
        FriendRequest.created_at.desc()
    ).all()


    requests = []


    for row in rows:

        if are_blocked(
            current_user.id,
            row.sender_id
        ):

            continue


        requests.append({

            "id":
                row.id,

            "sender":
                serialize_user(
                    row.sender
                ),

            "receiver":
                serialize_user(
                    row.receiver
                ),

            "status":
                row.status,

            "created_at":
                (
                    row.created_at.isoformat()
                    if row.created_at
                    else None
                )

        })


    return jsonify({
        "requests":
            requests
    })


# =========================================================
# SEND FRIEND REQUEST
# =========================================================

@app.post(
    "/api/friends/request"
)
@app.post(
    "/api/friends/request/<int:target_id>"
)
@token_required
def send_friend_request(
    current_user,
    target_id=None
):

    try:

        data = request.get_json(
            silent=True
        ) or {}


        receiver_id = target_id or data.get(
            "receiver_id"
        ) or data.get("user_id")


        if not receiver_id:

            return json_error(
                "receiver_id is required."
            )


        receiver = db.session.get(
            User,
            int(receiver_id)
        )


        if not receiver:

            return json_error(
                "User not found.",
                404
            )


        if receiver.id == current_user.id:

            return json_error(
                "You cannot add yourself."
            )


        if are_blocked(
            current_user.id,
            receiver.id
        ):

            return json_error(
                "This connection is unavailable.",
                403
            )


        if are_friends(
            current_user.id,
            receiver.id
        ):

            return json_error(
                "You are already friends."
            )


        existing = FriendRequest.query.filter(
            (
                (FriendRequest.sender_id == current_user.id)
                &
                (FriendRequest.receiver_id == receiver.id)
            )
            |
            (
                (FriendRequest.sender_id == receiver.id)
                &
                (FriendRequest.receiver_id == current_user.id)
            )
        ).filter(
            FriendRequest.status ==
            "pending"
        ).first()


        if existing:

            return json_error(
                "A friend request is already pending."
            )


        data = request.get_json(silent=True) or {}
        intro_message = (data.get("message") or "").strip()

        friend_request = FriendRequest(
            sender_id=current_user.id,
            receiver_id=receiver.id,
            status="pending"
        )

        db.session.add(
            friend_request
        )

        if intro_message:
            intro_msg_obj = Message(
                sender_id=current_user.id,
                receiver_id=receiver.id,
                content=intro_message,
                is_read=False
            )
            db.session.add(intro_msg_obj)

            if not receiver.is_online:
                try:
                    send_message_notification_email(
                        to_email=receiver.email,
                        to_name=receiver.name or receiver.username,
                        sender_name=current_user.name or current_user.username,
                        message_preview=intro_message
                    )
                except Exception as e:
                    print("Intro message email error:", e)

        db.session.commit()


        notify_user(
            receiver.id,
            "friend_request",
            "New Friend Request",
            (
                f"{current_user.name or current_user.username} "
                "sent you a friend request."
            ),
            related_user_id=current_user.id
        )


        emit_to_user(
            receiver.id,
            "friend_notification",
            {
                "type":
                    "friend_request",

                "title":
                    "New Friend Request",

                "message":
                    (
                        f"{current_user.name or current_user.username} "
                        "sent you a friend request."
                    ),

                "related_user_id":
                    current_user.id
            }
        )


        return jsonify({

            "message":
                "Friend request sent.",

            "request_id":
                friend_request.id

        }), 201


    except Exception as error:

        db.session.rollback()

        print(
            "SEND FRIEND REQUEST ERROR:",
            error
        )

        return json_error(
            "Unable to send friend request.",
            500
        )


# =========================================================
# ACCEPT / REJECT FRIEND REQUEST
# =========================================================

@app.put(
    "/api/friends/request/<int:request_id>"
)
@token_required
def update_friend_request(
    current_user,
    request_id
):

    try:

        data = request.get_json(
            silent=True
        ) or {}


        action = (
            data.get(
                "action"
            )
            or ""
        ).lower()


        request_row = db.session.get(
            FriendRequest,
            request_id
        )


        if not request_row:

            return json_error(
                "Friend request not found.",
                404
            )


        if (
            request_row.receiver_id !=
            current_user.id
        ):

            return json_error(
                "Unauthorized.",
                403
            )


        if request_row.status != "pending":

            return json_error(
                "This request is no longer pending."
            )


        sender = db.session.get(
            User,
            request_row.sender_id
        )


        if action == "accept":

            request_row.status = "accepted"

            db.session.commit()


            notify_user(
                request_row.sender_id,
                "friend_accepted",
                "Friend Request Accepted",
                (
                    f"{current_user.name or current_user.username} "
                    "accepted your friend request."
                ),
                related_user_id=current_user.id
            )


            emit_to_user(
                request_row.sender_id,
                "friend_notification",
                {
                    "type":
                        "friend_accepted",

                    "title":
                        "Friend Request Accepted",

                    "message":
                        (
                            f"{current_user.name or current_user.username} "
                            "accepted your friend request."
                        ),

                    "related_user_id":
                        current_user.id
                }
            )


            return jsonify({

                "message":
                    "Friend request accepted.",

                "request":
                    {
                        "id":
                            request_row.id,

                        "status":
                            request_row.status
                    }

            })


        if action == "reject":

            request_row.status = "rejected"

            db.session.commit()


            return jsonify({
                "message":
                    "Friend request rejected."
            })


        if action == "cancel":

            if (
                request_row.sender_id !=
                current_user.id
            ):

                return json_error(
                    "Unauthorized.",
                    403
                )

            request_row.status = "cancelled"

            db.session.commit()


            return jsonify({
                "message":
                    "Friend request cancelled."
            })


        return json_error(
            "Action must be accept, reject or cancel."
        )


    except Exception as error:

        db.session.rollback()

        print(
            "FRIEND REQUEST UPDATE ERROR:",
            error
        )

        return json_error(
            "Unable to update friend request.",
            500
        )


# =========================================================
# REMOVE FRIEND
# =========================================================

@app.delete(
    "/api/friends/<int:friend_id>"
)
@token_required
def remove_friend(
    current_user,
    friend_id
):

    row = FriendRequest.query.filter(
        FriendRequest.status ==
        "accepted"
    ).filter(
        (
            (FriendRequest.sender_id == current_user.id)
            &
            (FriendRequest.receiver_id == friend_id)
        )
        |
        (
            (FriendRequest.sender_id == friend_id)
            &
            (FriendRequest.receiver_id == current_user.id)
        )
    ).first()


    if not row:

        return json_error(
            "Friendship not found.",
            404
        )


    row.status = "removed"

    db.session.commit()


    return jsonify({
        "message":
            "Friend removed."
    })


# =========================================================
# BLOCK USER
# =========================================================

@app.post(
    "/api/users/<int:user_id>/block"
)
@token_required
def block_user(
    current_user,
    user_id
):

    if (
        current_user.id ==
        user_id
    ):

        return json_error(
            "You cannot block yourself."
        )


    target = db.session.get(
        User,
        user_id
    )


    if not target:

        return json_error(
            "User not found.",
            404
        )


    existing = Block.query.filter(
        Block.blocker_id ==
        current_user.id
    ).filter(
        Block.blocked_id ==
        target.id
    ).first()


    if existing:

        return jsonify({
            "message":
                "User is already blocked."
        })


    block = Block(
        blocker_id=current_user.id,
        blocked_id=target.id
    )


    db.session.add(
        block
    )


    # Remove active friendship
    friendship = FriendRequest.query.filter(
        FriendRequest.status ==
        "accepted"
    ).filter(
        (
            (FriendRequest.sender_id == current_user.id)
            &
            (FriendRequest.receiver_id == target.id)
        )
        |
        (
            (FriendRequest.sender_id == target.id)
            &
            (FriendRequest.receiver_id == current_user.id)
        )
    ).first()


    if friendship:

        friendship.status = "removed"


    db.session.commit()


    emit_to_user(
        target.id,
        "system_notification",
        {
            "type":
                "safety",

            "title":
                "Connection Updated",

            "message":
                "A connection has changed."
        }
    )


    return jsonify({
        "message":
            "User blocked."
    })


# =========================================================
# UNBLOCK USER
# =========================================================

@app.delete(
    "/api/users/<int:user_id>/block"
)
@app.post(
    "/api/users/<int:user_id>/unblock"
)
@token_required
def unblock_user(
    current_user,
    user_id
):

    block = Block.query.filter(
        Block.blocker_id ==
        current_user.id
    ).filter(
        Block.blocked_id ==
        user_id
    ).first()


    if not block:

        return json_error(
            "User is not blocked.",
            404
        )


    db.session.delete(
        block
    )

    # Restore previous accepted friendship status if present
    friendship = FriendRequest.query.filter(
        (
            (FriendRequest.sender_id == current_user.id)
            &
            (FriendRequest.receiver_id == user_id)
        )
        |
        (
            (FriendRequest.sender_id == user_id)
            &
            (FriendRequest.receiver_id == current_user.id)
        )
    ).order_by(
        FriendRequest.created_at.desc()
    ).first()

    if friendship and friendship.status == "removed":
        friendship.status = "accepted"

    db.session.commit()


    return jsonify({
        "message":
            "User unblocked.",
        "friendship_status":
            friendship.status if friendship else "none"
    })


# =========================================================
# BLOCKED USERS
# =========================================================

@app.get(
    "/api/users/blocked"
)
@token_required
def get_blocked_users(
    current_user
):

    rows = Block.query.filter(
        Block.blocker_id ==
        current_user.id
    ).order_by(
        Block.created_at.desc()
    ).all()


    users = []


    for row in rows:

        user = db.session.get(
            User,
            row.blocked_id
        )

        if user:

            users.append(
                serialize_user(
                    user
                )
            )


    return jsonify({
        "blocked_users":
            users
    })


# =========================================================
# REPORT USER
# =========================================================

@app.post(
    "/api/users/<int:user_id>/report"
)
@token_required
def report_user(
    current_user,
    user_id
):

    if (
        current_user.id ==
        user_id
    ):

        return json_error(
            "You cannot report yourself."
        )


    target = db.session.get(
        User,
        user_id
    )


    if not target:

        return json_error(
            "User not found.",
            404
        )


    data = request.get_json(
        silent=True
    ) or {}


    reason = (
        str(
            data.get(
                "reason"
            )
            or ""
        ).strip().lower()
    )


    details = (
        str(
            data.get(
                "details"
            )
            or ""
        )[:1000]
    )


    allowed_reasons = {
        "spam",
        "harassment",
        "fake_account",
        "inappropriate_content",
        "other"
    }


    if reason not in allowed_reasons:

        return json_error(
            "Invalid report reason."
        )


    report = Report(
        reporter_id=current_user.id,
        reported_user_id=target.id,
        reason=reason,
        details=details,
        status="pending"
    )


    db.session.add(
        report
    )

    db.session.commit()


    return jsonify({

        "message":
            "Report submitted successfully.",

        "report_id":
            report.id

    }), 201


# =========================================================
# MESSAGES - AUTHORIZATION
# =========================================================

def can_message(
    current_user_id,
    target_user_id
):

    if (
        current_user_id ==
        target_user_id
    ):
        return False

    if are_blocked(
        current_user_id,
        target_user_id
    ):
        return False

    return are_friends(
        current_user_id,
        target_user_id
    )


# =========================================================
# SEND MESSAGE - REST
# =========================================================

@app.post(
    "/api/messages"
)
@token_required
def send_message_rest(
    current_user
):

    try:

        data = request.get_json(
            silent=True
        ) or {}


        receiver_id = data.get(
            "receiver_id"
        )

        content = (
            str(
                data.get(
                    "content"
                )
                or ""
            ).strip()
        )


        if not receiver_id:

            return json_error(
                "receiver_id is required."
            )


        if not content:

            return json_error(
                "Message cannot be empty."
            )


        if len(content) > 5000:

            return json_error(
                "Message is too long."
            )


        receiver = db.session.get(
            User,
            int(receiver_id)
        )


        if not receiver:

            return json_error(
                "Receiver not found.",
                404
            )


        if not can_message(
            current_user.id,
            receiver.id
        ):

            return json_error(
                "You can only message accepted friends.",
                403
            )


        message = Message(
            sender_id=current_user.id,
            receiver_id=receiver.id,
            content=content,
            is_read=False
        )


        db.session.add(
            message
        )

        db.session.commit()


        serialized = serialize_message(
            message
        )


        notify_user(
            receiver.id,
            "new_message",
            (
                f"New message from "
                f"{current_user.name or current_user.username}"
            ),
            content[:200],
            related_user_id=current_user.id,
            related_message_id=message.id
        )


        emit_to_user(
            receiver.id,
            "message_notification",
            {
                "message":
                    serialized,

                "sender":
                    serialize_user(
                        current_user
                    )
            }
        )


        socketio.emit(
            "new_message",
            serialized,
            room=room_name(
                current_user.id,
                receiver.id
            )
        )
        emit_to_user(receiver.id, "new_message", serialized)
        emit_to_user(current_user.id, "new_message", serialized)


        return jsonify({
            "message":
                serialized
        }), 201


    except Exception as error:

        db.session.rollback()

        print(
            "SEND MESSAGE ERROR:",
            error
        )

        return json_error(
            "Unable to send message.",
            500
        )


# =========================================================
# CHAT MEDIA UPLOAD (IMAGES & VIDEOS)
# =========================================================

CHAT_UPLOAD_FOLDER = os.path.join(app.root_path, "uploads", "chat_media")
os.makedirs(CHAT_UPLOAD_FOLDER, exist_ok=True)

ALLOWED_IMAGE_EXTS = {"jpg", "jpeg", "png", "gif", "webp", "svg"}
ALLOWED_VIDEO_EXTS = {"mp4", "webm", "mov", "avi", "mkv"}
ALLOWED_CHAT_MEDIA_EXTS = ALLOWED_IMAGE_EXTS | ALLOWED_VIDEO_EXTS


@app.post(
    "/api/messages/upload"
)
@token_required
def upload_chat_media(
    current_user
):
    try:
        receiver_id = request.form.get("receiver_id")
        if not receiver_id:
            return json_error("receiver_id is required.", 400)

        receiver = db.session.get(User, int(receiver_id))
        if not receiver:
            return json_error("Receiver user not found.", 404)

        if not can_message(current_user.id, receiver.id):
            return json_error("You can only message accepted friends.", 403)

        if "file" not in request.files:
            return json_error("No media file uploaded.", 400)

        file = request.files["file"]
        if not file or file.filename == "":
            return json_error("Invalid file.", 400)

        filename_lower = file.filename.lower()
        ext = filename_lower.rsplit(".", 1)[-1] if "." in filename_lower else ""

        if ext not in ALLOWED_CHAT_MEDIA_EXTS:
            return json_error(f"File type .{ext} is not supported. Please upload an image or video.", 400)

        media_type = "IMAGE" if ext in ALLOWED_IMAGE_EXTS else "VIDEO"
        safe_name = f"{uuid.uuid4().hex}_{secure_filename(file.filename)}"
        filepath = os.path.join(CHAT_UPLOAD_FOLDER, safe_name)
        file.save(filepath)

        media_url = f"/media/chat/{safe_name}"
        caption = (request.form.get("content") or "").strip()

        formatted_content = f"[{media_type}]:{media_url}"
        if caption:
            formatted_content += f" {caption}"

        message = Message(
            sender_id=current_user.id,
            receiver_id=receiver.id,
            content=formatted_content,
            is_read=False
        )
        db.session.add(message)
        db.session.commit()

        serialized = serialize_message(message)

        notify_user(
            receiver.id,
            "new_message",
            f"New {media_type.lower()} from {current_user.name or current_user.username}",
            caption or f"Sent a {media_type.lower()}",
            related_user_id=current_user.id,
            related_message_id=message.id
        )

        room = room_name(current_user.id, receiver.id)
        socketio.emit("new_message", serialized, room=room)
        emit_to_user(receiver.id, "new_message", serialized)
        emit_to_user(current_user.id, "new_message", serialized)

        return jsonify({
            "message": serialized
        }), 201

    except Exception as error:
        db.session.rollback()
        print("CHAT MEDIA UPLOAD ERROR:", error)
        return json_error("Unable to upload media.", 500)


@app.get(
    "/media/chat/<filename>"
)
def serve_chat_media(filename):
    return send_from_directory(CHAT_UPLOAD_FOLDER, filename)


# =========================================================
# GET CHAT MESSAGES
# =========================================================

@app.get(
    "/api/messages/<int:friend_id>"
)
@token_required
def get_messages(
    current_user,
    friend_id
):

    if not can_message(
        current_user.id,
        friend_id
    ):

        return json_error(
            "Private chat is unavailable.",
            403
        )


    limit = request.args.get(
        "limit",
        100,
        type=int
    )

    limit = min(
        max(limit, 1),
        200
    )


    # Auto mark incoming messages as read when user opens the conversation
    unread_rows = Message.query.filter(
        (Message.sender_id == friend_id) &
        (Message.receiver_id == current_user.id) &
        (Message.is_read.is_(False))
    ).update({"is_read": True}, synchronize_session=False)

    if unread_rows > 0:
        db.session.commit()
        room = room_name(current_user.id, friend_id)
        read_payload = {
            "user_id": current_user.id,
            "reader_id": current_user.id,
            "friend_id": friend_id
        }
        socketio.emit("message_read", read_payload, room=room)
        socketio.emit("messages_read", read_payload, room=room)
        emit_to_user(friend_id, "message_read", read_payload)
        emit_to_user(current_user.id, "message_read", read_payload)

    rows = Message.query.filter(
        (
            (Message.sender_id == current_user.id)
            &
            (Message.receiver_id == friend_id)
        )
        |
        (
            (Message.sender_id == friend_id)
            &
            (Message.receiver_id == current_user.id)
        )
    ).order_by(
        Message.created_at.asc()
    ).limit(
        limit
    ).all()


    return jsonify({

        "messages":
            [
                serialize_message(
                    message
                )
                for message
                in rows
            ]

    })


# =========================================================
# MARK MESSAGES AS READ
# =========================================================

@app.put(
    "/api/messages/<int:friend_id>/read"
)
@token_required
def mark_messages_as_read(
    current_user,
    friend_id
):
    try:
        updated_count = Message.query.filter(
            (Message.sender_id == friend_id) &
            (Message.receiver_id == current_user.id) &
            (Message.is_read.is_(False))
        ).update({"is_read": True}, synchronize_session=False)

        if updated_count > 0:
            db.session.commit()
            room = room_name(current_user.id, friend_id)
            read_payload = {
                "user_id": current_user.id,
                "reader_id": current_user.id,
                "friend_id": friend_id
            }
            socketio.emit("message_read", read_payload, room=room)
            socketio.emit("messages_read", read_payload, room=room)
            emit_to_user(friend_id, "message_read", read_payload)
            emit_to_user(current_user.id, "message_read", read_payload)

        return jsonify({
            "message": "Messages marked as read",
            "updated_count": updated_count
        }), 200
    except Exception as error:
        db.session.rollback()
        print("MARK MESSAGES READ ERROR:", error)
        return json_error("Unable to mark messages as read.", 500)


# =========================================================
# CONVERSATIONS
# =========================================================

@app.get(
    "/api/messages/conversations"
)
@token_required
def conversations(
    current_user
):

    friend_rows = FriendRequest.query.filter(
        FriendRequest.status ==
        "accepted"
    ).filter(
        (
            FriendRequest.sender_id ==
            current_user.id
        )
        |
        (
            FriendRequest.receiver_id ==
            current_user.id
        )
    ).all()


    conversation_list = []


    for friend_row in friend_rows:

        friend_id = (
            friend_row.receiver_id
            if
            friend_row.sender_id ==
            current_user.id
            else
            friend_row.sender_id
        )


        if are_blocked(
            current_user.id,
            friend_id
        ):

            continue


        friend = db.session.get(
            User,
            friend_id
        )


        if not friend:
            continue


        latest = Message.query.filter(
            (
                (Message.sender_id == current_user.id)
                &
                (Message.receiver_id == friend_id)
            )
            |
            (
                (Message.sender_id == friend_id)
                &
                (Message.receiver_id == current_user.id)
            )
        ).order_by(
            Message.created_at.desc()
        ).first()


        unread = Message.query.filter(
            Message.sender_id ==
            friend_id
        ).filter(
            Message.receiver_id ==
            current_user.id
        ).filter(
            Message.is_read.is_(False)
        ).count()


        friend_data = serialize_user(
            friend
        )


        if not friend.show_online_status:

            friend_data["is_online"] = False


        conversation_list.append({

            "friend":
                friend_data,

            "latest_message":
                (
                    serialize_message(
                        latest
                    )
                    if latest
                    else None
                ),

            "unread_count":
                unread

        })


    conversation_list.sort(
        key=lambda item:
            (
                item[
                    "latest_message"
                ][
                    "created_at"
                ]
                if item[
                    "latest_message"
                ]
                else
                ""
            ),
        reverse=True
    )


    return jsonify({

        "conversations":
            conversation_list

    })


# =========================================================
# UNREAD MESSAGE COUNT
# =========================================================

@app.get(
    "/api/messages/unread/count"
)
@token_required
def unread_message_count(
    current_user
):

    count = Message.query.filter(
        Message.receiver_id ==
        current_user.id
    ).filter(
        Message.is_read.is_(False)
    ).count()


    return jsonify({
        "unread_count":
            count
    })


# =========================================================
# MARK MESSAGE AS READ
# =========================================================

@app.put(
    "/api/messages/<int:friend_id>/read"
)
@token_required
def mark_messages_read(
    current_user,
    friend_id
):

    if not can_message(
        current_user.id,
        friend_id
    ):

        return json_error(
            "Private chat is unavailable.",
            403
        )


    Message.query.filter(
        Message.sender_id ==
        friend_id
    ).filter(
        Message.receiver_id ==
        current_user.id
    ).filter(
        Message.is_read.is_(False)
    ).update(
        {
            "is_read":
                True
        },
        synchronize_session=False
    )


    db.session.commit()


    room = room_name(
        current_user.id,
        friend_id
    )


    socketio.emit(
        "message_read",
        {
            "reader_id":
                current_user.id
        },
        room=room
    )


    socketio.emit(
        "messages_read",
        {
            "reader_id":
                current_user.id
        },
        room=room
    )


    return jsonify({
        "message":
            "Messages marked as read."
    })


# =========================================================
# NOTIFICATIONS
# =========================================================

@app.get(
    "/api/notifications"
)
@token_required
def get_notifications(
    current_user
):

    rows = Notification.query.filter(
        Notification.user_id ==
        current_user.id
    ).order_by(
        Notification.created_at.desc()
    ).limit(
        100
    ).all()


    unread_count = Notification.query.filter(
        Notification.user_id ==
        current_user.id
    ).filter(
        Notification.is_read.is_(False)
    ).count()


    return jsonify({

        "notifications":
            [
                serialize_notification(
                    row
                )
                for row in rows
            ],

        "unread_count":
            unread_count

    })


# =========================================================
# NOTIFICATION UNREAD COUNT
# =========================================================

@app.get(
    "/api/notifications/unread/count"
)
@token_required
def unread_notification_count(
    current_user
):

    count = Notification.query.filter(
        Notification.user_id ==
        current_user.id
    ).filter(
        Notification.is_read.is_(False)
    ).count()


    return jsonify({
        "unread_count":
            count
    })


# =========================================================
# MARK ONE NOTIFICATION READ
# =========================================================

@app.put(
    "/api/notifications/<int:notification_id>/read"
)
@token_required
def mark_notification_read(
    current_user,
    notification_id
):

    notification = Notification.query.filter(
        Notification.id ==
        notification_id
    ).filter(
        Notification.user_id ==
        current_user.id
    ).first()


    if not notification:

        return json_error(
            "Notification not found.",
            404
        )


    notification.is_read = True

    db.session.commit()


    return jsonify({
        "message":
            "Notification marked as read."
    })


# =========================================================
# MARK ALL NOTIFICATIONS READ
# =========================================================

@app.put(
    "/api/notifications/read-all"
)
@token_required
def mark_all_notifications_read(
    current_user
):

    Notification.query.filter(
        Notification.user_id ==
        current_user.id
    ).filter(
        Notification.is_read.is_(False)
    ).update(
        {
            "is_read":
                True
        },
        synchronize_session=False
    )


    db.session.commit()


    return jsonify({
        "message":
            "All notifications marked as read."
    })


# =========================================================
# SOCKET.IO AUTH
# =========================================================

def socket_current_user(
    auth=None
):
    for uid, sockets in connected_users.items():
        if hasattr(request, "sid") and request.sid in sockets:
            return uid

    token = None
    if isinstance(auth, dict):
        token = auth.get("token")
        if not token and "auth" in auth and isinstance(auth["auth"], dict):
            token = auth["auth"].get("token")

    if not token and hasattr(request, "args"):
        token = request.args.get("token")

    if not token:
        return None

    payload = decode_token(token)
    if not payload:
        return None

    user_id = payload.get("user_id")
    if not user_id:
        return None

    return int(user_id)


# =========================================================
# SOCKET CONNECT
# =========================================================

@socketio.on(
    "connect"
)
def socket_connect(
    auth
):

    user_id = socket_current_user(
        auth
    )


    if not user_id:

        print(
            "SOCKET AUTH FAILED"
        )

        return False


    sid = request.sid


    connected_users.setdefault(
        user_id,
        set()
    ).add(
        sid
    )


    join_room(
        user_room(
            user_id
        )
    )


    with app.app_context():

        user = db.session.get(
            User,
            user_id
        )

        if user:

            user.is_online = True

            db.session.commit()


    print(
        f"SOCKET CONNECTED: "
        f"user={user_id}, sid={sid}"
    )


    emit(
        "connected",
        {
            "user_id":
                user_id
        }
    )


# =========================================================
# SOCKET DISCONNECT
# =========================================================

@socketio.on(
    "disconnect"
)
def socket_disconnect():

    sid = request.sid

    disconnected_user = None


    for user_id, sockets in list(
        connected_users.items()
    ):

        if sid in sockets:

            sockets.discard(
                sid
            )

            disconnected_user = (
                user_id
            )


            if not sockets:

                del connected_users[
                    user_id
                ]

            break


    if disconnected_user:

        with app.app_context():

            user = db.session.get(
                User,
                disconnected_user
            )

            if user:

                user.is_online = False

                db.session.commit()


        print(
            f"SOCKET DISCONNECTED: "
            f"user={disconnected_user}, "
            f"sid={sid}"
        )


# =========================================================
# SOCKET JOIN CHAT
# =========================================================

@socketio.on(
    "join_room"
)
def socket_join_room(
    data
):

    user_id = socket_current_user(
        data
    )


    if not user_id:

        emit(
            "error",
            {
                "message":
                    "Authentication required."
            }
        )

        return


    friend_id = (
        data.get(
            "friend_id"
        )
        if isinstance(
            data,
            dict
        )
        else None
    )


    if not friend_id:

        emit(
            "error",
            {
                "message":
                    "friend_id is required."
            }
        )

        return


    with app.app_context():

        if not can_message(
            user_id,
            int(friend_id)
        ):

            emit(
                "error",
                {
                    "message":
                        "Private chat is unavailable."
                }
            )

            return


    room = room_name(
        user_id,
        int(friend_id)
    )


    join_room(
        room
    )


    emit(
        "joined_room",
        {
            "room":
                room,

            "friend_id":
                int(friend_id)
        }
    )


# =========================================================
# SOCKET LEAVE ROOM
# =========================================================

@socketio.on(
    "leave_room"
)
def socket_leave_room(
    data
):

    friend_id = (
        data.get(
            "friend_id"
        )
        if isinstance(
            data,
            dict
        )
        else None
    )


    if not friend_id:
        return


    user_id = None


    for current_user_id, sockets in connected_users.items():

        if request.sid in sockets:

            user_id = current_user_id
            break


    if not user_id:
        return


    room = room_name(
        user_id,
        int(friend_id)
    )


    leave_room(
        room
    )


# =========================================================
# SOCKET SEND MESSAGE
# =========================================================

@socketio.on(
    "send_message"
)
def socket_send_message(
    data
):

    try:

        if not isinstance(
            data,
            dict
        ):
            return


        sender_id = socket_current_user(data)

        if not sender_id:

            emit(
                "error",
                {
                    "message":
                        "Authentication failed."
                }
            )

            return


        receiver_id = int(
            data.get(
                "receiver_id"
            )
        )


        content = (
            str(
                data.get(
                    "content"
                )
                or ""
            ).strip()
        )


        if not content:

            return


        with app.app_context():

            sender = db.session.get(
                User,
                sender_id
            )

            receiver = db.session.get(
                User,
                receiver_id
            )


            if not sender or not receiver:

                emit(
                    "error",
                    {
                        "message":
                            "User not found."
                    }
                )

                return


            if not can_message(
                sender_id,
                receiver_id
            ):

                emit(
                    "error",
                    {
                        "message":
                            "Private chat is unavailable."
                    }
                )

                return


            message = Message(
                sender_id=sender_id,
                receiver_id=receiver_id,
                content=content,
                is_read=False
            )


            db.session.add(
                message
            )

            db.session.commit()


            serialized = (
                serialize_message(
                    message
                )
            )


            notification = (
                Notification(
                    user_id=receiver_id,
                    type="new_message",
                    title=(
                        f"New message from "
                        f"{sender.name or sender.username}"
                    ),
                    message=content[:200],
                    related_user_id=sender_id,
                    related_message_id=message.id,
                    is_read=False
                )
            )


            db.session.add(
                notification
            )

            db.session.commit()

            # Send email notification if receiver is offline
            if receiver and receiver.email and not receiver.is_online:
                try:
                    send_message_notification_email(
                        receiver.email,
                        receiver.name or receiver.username,
                        sender.name or sender.username,
                        content[:200]
                    )
                except Exception as e:
                    print("Offline message email notification error:", e)


            room = room_name(
                sender_id,
                receiver_id
            )


            socketio.emit(
                "new_message",
                serialized,
                room=room
            )
            emit_to_user(receiver_id, "new_message", serialized)
            emit_to_user(sender_id, "new_message", serialized)


            socketio.emit(
                "message_notification",
                {
                    "message":
                        serialized,

                    "sender":
                        serialize_user(
                            sender
                        )
                },
                room=user_room(
                    receiver_id
                )
            )


            socketio.emit(
                "system_notification",
                serialize_notification(
                    notification
                ),
                room=user_room(
                    receiver_id
                )
            )


    except Exception as error:

        print(
            "SOCKET SEND MESSAGE ERROR:",
            error
        )

        emit(
            "error",
            {
                "message":
                    "Message could not be sent."
            }
        )


# =========================================================
# SOCKET TYPING
# =========================================================

@socketio.on(
    "typing"
)
def socket_typing(
    data
):

    try:

        if not isinstance(
            data,
            dict
        ):
            return


        user_id = socket_current_user(data)

        if not user_id:
            return


        friend_id = int(
            data.get(
                "friend_id"
            )
        )


        with app.app_context():

            if not can_message(
                user_id,
                friend_id
            ):
                return


        room = room_name(
            user_id,
            friend_id
        )


        emit(
            "user_typing",
            {
                "user_id":
                    user_id
            },
            room=room,
            include_self=False
        )


    except Exception as error:

        print(
            "SOCKET TYPING ERROR:",
            error
        )


# =========================================================
# SOCKET STOP TYPING
# =========================================================

@socketio.on(
    "stop_typing"
)
def socket_stop_typing(
    data
):

    try:

        if not isinstance(
            data,
            dict
        ):
            return


        user_id = socket_current_user(data)

        if not user_id:
            return


        friend_id = int(
            data.get(
                "friend_id"
            )
        )


        with app.app_context():

            if not can_message(
                user_id,
                friend_id
            ):
                return


        room = room_name(
            user_id,
            friend_id
        )


        emit(
            "user_stopped_typing",
            {
                "user_id":
                    user_id
            },
            room=room,
            include_self=False
        )


    except Exception as error:

        print(
            "SOCKET STOP TYPING ERROR:",
            error
        )


# =========================================================
# SOCKET MARK READ
# =========================================================

@socketio.on(
    "mark_read"
)
def socket_mark_read(
    data
):

    try:

        if not isinstance(
            data,
            dict
        ):
            return


        reader_id = socket_current_user(data)

        if not reader_id:
            return


        sender_id = int(
            data.get(
                "friend_id"
            )
        )


        with app.app_context():

            if not can_message(
                reader_id,
                sender_id
            ):
                return


            Message.query.filter(
                Message.sender_id ==
                sender_id
            ).filter(
                Message.receiver_id ==
                reader_id
            ).filter(
                Message.is_read.is_(False)
            ).update(
                {
                    "is_read":
                        True
                },
                synchronize_session=False
            )


            db.session.commit()


        room = room_name(
            reader_id,
            sender_id
        )


        emit(
            "message_read",
            {
                "reader_id":
                    reader_id
            },
            room=room
        )


        emit(
            "messages_read",
            {
                "reader_id":
                    reader_id
            },
            room=room
        )


    except Exception as error:

        print(
            "SOCKET MARK READ ERROR:",
            error
        )


# =========================================================
# SOCKET HEARTBEAT / PING
# =========================================================

@socketio.on(
    "ping_server"
)
def ping_server():

    emit(
        "pong_server",
        {
            "time":
                datetime.utcnow().isoformat()
        }
    )


# =========================================================
# ERROR HANDLERS
# =========================================================

@app.errorhandler(
    404
)
def not_found(
    error
):

    if request.path.startswith(
        "/api/"
    ):

        return jsonify({
            "error":
                "Not found."
        }), 404

    return (
        "NearConnect - Page not found",
        404
    )


@app.errorhandler(
    413
)
def file_too_large(
    error
):

    if request.path.startswith(
        "/api/"
    ):

        return jsonify({
            "error":
                "File is too large. Maximum size is 5 MB."
        }), 413

    return (
        "File too large.",
        413
    )


@app.errorhandler(
    500
)
def internal_server_error(
    error
):

    print(
        "INTERNAL SERVER ERROR:",
        error
    )


    if request.path.startswith(
        "/api/"
    ):

        return jsonify({
            "error":
                "Something went wrong. Please try again."
        }), 500


# =========================================================
# ADMIN - DELETE USER BY EMAIL
# =========================================================

@app.post(
    "/api/admin/delete-user"
)
def admin_delete_user():
    """Deletes a user account by email from database along with associated records."""
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()

    if not email:
        return json_error("Email is required.")

    user = User.query.filter(db.func.lower(User.email) == email).first()

    if not user:
        return jsonify({
            "message": f"User {email} is not in the database.",
            "deleted": False
        }), 404

    uid = user.id
    Notification.query.filter((Notification.user_id == uid) | (Notification.related_user_id == uid)).delete(synchronize_session=False)
    Message.query.filter((Message.sender_id == uid) | (Message.receiver_id == uid)).delete(synchronize_session=False)
    FriendRequest.query.filter((FriendRequest.sender_id == uid) | (FriendRequest.receiver_id == uid)).delete(synchronize_session=False)
    Block.query.filter((Block.blocker_id == uid) | (Block.blocked_id == uid)).delete(synchronize_session=False)
    Report.query.filter((Report.reporter_id == uid) | (Report.reported_user_id == uid)).delete(synchronize_session=False)

    db.session.delete(user)
    db.session.commit()

    return jsonify({
        "message": f"User {email} and all associated data successfully deleted.",
        "deleted": True
    })


# =========================================================
# BREVO EMAIL API & PASSWORD RESET ROUTES
# =========================================================

@app.get(
    "/api/email/status"
)
def email_status():
    """Returns Brevo integration status and remaining credits."""
    status_info = check_brevo_account()
    return jsonify(status_info)


@app.post(
    "/api/email/test"
)
def send_test_email():
    """Send a test email branded with NearConnect."""
    data = request.get_json(silent=True) or {}
    to_email = (data.get("email") or "").strip()
    to_name = (data.get("name") or "Tester").strip()

    if not to_email:
        return json_error("Recipient email is required.")

    res = send_brevo_email(
        to_email=to_email,
        to_name=to_name,
        subject="NearConnect - Test Email Integration",
        html_content="<p>This is a test email sent from <strong>NearConnect</strong> via Brevo Email API.</p>",
        async_send=False
    )
    if res.get("success"):
        return jsonify({"message": f"Test email sent to {to_email} from NearConnect.", "res": res})
    else:
        return json_error(f"Failed to send test email: {res.get('error')}", 500)


@app.post(
    "/api/auth/forgot-password"
)
def forgot_password():
    """Generates a 6-digit OTP and emails it via Brevo NearConnect sender."""
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()

    if not email:
        return json_error("Email is required.")

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({
            "message": "If an account exists with that email, a password reset code has been sent."
        })

    otp = f"{random.randint(100000, 999999)}"
    user.reset_otp = otp
    user.reset_otp_expires = datetime.utcnow() + timedelta(minutes=15)
    db.session.commit()

    send_password_reset_email(user.email, user.name or user.username, otp)

    return jsonify({
        "message": "Password reset code sent successfully."
    })


@app.post(
    "/api/auth/verify-reset-otp"
)
def verify_reset_otp():
    """Verifies 6-digit OTP code."""
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    otp = (data.get("otp") or "").strip()

    if not email or not otp:
        return json_error("Email and OTP are required.")

    user = User.query.filter_by(email=email).first()
    if not user or not user.reset_otp or user.reset_otp != otp:
        return json_error("Invalid or expired OTP code.", 400)

    if user.reset_otp_expires and datetime.utcnow() > user.reset_otp_expires:
        return json_error("OTP code has expired. Please request a new one.", 400)

    return jsonify({
        "message": "OTP verified successfully.",
        "valid": True
    })


@app.post(
    "/api/auth/reset-password"
)
def reset_password():
    """Resets user password with valid OTP."""
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    otp = (data.get("otp") or "").strip()
    new_password = data.get("new_password") or ""

    if not email or not otp or not new_password:
        return json_error("Email, OTP code, and new password are required.")

    if len(new_password) < 6:
        return json_error("Password must be at least 6 characters.")

    user = User.query.filter_by(email=email).first()
    if not user or not user.reset_otp or user.reset_otp != otp:
        return json_error("Invalid or expired OTP code.", 400)

    if user.reset_otp_expires and datetime.utcnow() > user.reset_otp_expires:
        return json_error("OTP code has expired. Please request a new one.", 400)

    user.password = generate_password_hash(new_password)
    user.reset_otp = None
    user.reset_otp_expires = None
    db.session.commit()

    return jsonify({
        "message": "Password updated successfully. You can now log in with your new password."
    })



# =========================================================
# STARTUP
# =========================================================

def ensure_database():
    with app.app_context():
        db.create_all()
        with db.engine.connect() as conn:
            for col, col_type in [
                ("is_edited", "BOOLEAN DEFAULT 0"),
                ("is_deleted", "BOOLEAN DEFAULT 0"),
                ("is_pinned", "BOOLEAN DEFAULT 0")
            ]:
                try:
                    conn.execute(text(f"ALTER TABLE messages ADD COLUMN {col} {col_type};"))
                    conn.commit()
                except Exception:
                    pass

ensure_database()


# =========================================================
# MAIN
# =========================================================

if __name__ == "__main__":

    print(
        "--------------------------------"
    )

    print(
        "NearConnect Flask + Socket.IO"
    )

    print(
        "Server running on:"
    )

    print(
        "http://127.0.0.1:5001"
    )

    print(
        "--------------------------------"
    )


    port = int(os.environ.get("PORT", 5001))
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"

    socketio.run(
        app,
        host="0.0.0.0",
        port=port,
        debug=debug,
        allow_unsafe_werkzeug=True
    )