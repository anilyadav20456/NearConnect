from flask_sqlalchemy import SQLAlchemy
from datetime import datetime


# =========================================================
# DATABASE
# =========================================================

db = SQLAlchemy()


# =========================================================
# USER MODEL
# =========================================================

class User(db.Model):

    __tablename__ = "users"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    name = db.Column(
        db.String(100),
        nullable=False
    )

    username = db.Column(
        db.String(50),
        unique=True,
        nullable=False
    )

    email = db.Column(
        db.String(120),
        unique=True,
        nullable=False
    )

    password = db.Column(
        db.String(255),
        nullable=False
    )

    # =====================================================
    # PROFILE
    # =====================================================

    bio = db.Column(
        db.String(500),
        nullable=True,
        default=""
    )

    profession = db.Column(
        db.String(100),
        nullable=True,
        default=""
    )

    interests = db.Column(
        db.String(500),
        nullable=True,
        default=""
    )

    profile_image = db.Column(
        db.String(500),
        nullable=True,
        default=""
    )

    date_of_birth = db.Column(
        db.Date,
        nullable=True
    )

    # =====================================================
    # LOCATION
    # =====================================================

    latitude = db.Column(
        db.Float,
        nullable=True
    )

    longitude = db.Column(
        db.Float,
        nullable=True
    )

    # =====================================================
    # PRIVACY / STATUS
    # =====================================================

    is_discoverable = db.Column(
        db.Boolean,
        default=True,
        nullable=False
    )

    is_online = db.Column(
        db.Boolean,
        default=False,
        nullable=False
    )

    show_online_status = db.Column(
        db.Boolean,
        default=True,
        nullable=False
    )

    # =====================================================
    # SETTINGS
    # =====================================================

    language = db.Column(
        db.String(10),
        default="en",
        nullable=False
    )

    default_radius = db.Column(
        db.Integer,
        default=2,
        nullable=False
    )

    # =====================================================
    # TIMESTAMPS
    # =====================================================

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )


# =========================================================
# FRIEND REQUEST MODEL
# =========================================================

class FriendRequest(db.Model):

    __tablename__ = "friend_requests"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    sender_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    receiver_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    status = db.Column(
        db.String(20),
        default="pending",
        nullable=False
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    sender = db.relationship(
        "User",
        foreign_keys=[sender_id]
    )

    receiver = db.relationship(
        "User",
        foreign_keys=[receiver_id]
    )


# =========================================================
# MESSAGE MODEL
# =========================================================

class Message(db.Model):

    __tablename__ = "messages"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    sender_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    receiver_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    content = db.Column(
        db.Text,
        nullable=False
    )

    is_read = db.Column(
        db.Boolean,
        default=False,
        nullable=False
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    sender = db.relationship(
        "User",
        foreign_keys=[sender_id]
    )

    receiver = db.relationship(
        "User",
        foreign_keys=[receiver_id]
    )


# =========================================================
# NOTIFICATION MODEL
# =========================================================

class Notification(db.Model):

    __tablename__ = "notifications"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    type = db.Column(
        db.String(50),
        nullable=False
    )

    title = db.Column(
        db.String(150),
        nullable=False
    )

    message = db.Column(
        db.String(500),
        nullable=False
    )

    related_user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=True,
        index=True
    )

    related_message_id = db.Column(
        db.Integer,
        db.ForeignKey("messages.id"),
        nullable=True,
        index=True
    )

    is_read = db.Column(
        db.Boolean,
        default=False,
        nullable=False,
        index=True
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )

    user = db.relationship(
        "User",
        foreign_keys=[user_id]
    )

    related_user = db.relationship(
        "User",
        foreign_keys=[related_user_id]
    )

    related_message = db.relationship(
        "Message",
        foreign_keys=[related_message_id]
    )


# =========================================================
# BLOCK MODEL
# =========================================================

class Block(db.Model):

    __tablename__ = "blocks"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    blocker_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    blocked_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    blocker = db.relationship(
        "User",
        foreign_keys=[blocker_id]
    )

    blocked = db.relationship(
        "User",
        foreign_keys=[blocked_id]
    )


# =========================================================
# REPORT MODEL
# =========================================================

class Report(db.Model):

    __tablename__ = "reports"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    reporter_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    reported_user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    reason = db.Column(
        db.String(50),
        nullable=False
    )

    details = db.Column(
        db.String(1000),
        nullable=True,
        default=""
    )

    status = db.Column(
        db.String(30),
        default="pending",
        nullable=False,
        index=True
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )

    reporter = db.relationship(
        "User",
        foreign_keys=[reporter_id]
    )

    reported_user = db.relationship(
        "User",
        foreign_keys=[reported_user_id]
    )