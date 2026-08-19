import sqlite3
import os


# =========================================================
# DATABASE LOCATION
# =========================================================

db_path = os.path.join(
    "instance",
    "nearconnect.db"
)


print("--------------------------------")
print("NearConnect Profile Migration")
print("--------------------------------")


if not os.path.exists(db_path):

    print(
        "Database not found:",
        db_path
    )

    raise SystemExit


conn = sqlite3.connect(db_path)

cursor = conn.cursor()


# =========================================================
# CHECK USERS TABLE
# =========================================================

cursor.execute(
    "PRAGMA table_info(users)"
)

columns = [
    row[1]
    for row in cursor.fetchall()
]


print(
    "Existing columns:",
    columns
)


# =========================================================
# ADD DATE OF BIRTH
# =========================================================

if "date_of_birth" not in columns:

    cursor.execute(
        """
        ALTER TABLE users
        ADD COLUMN date_of_birth DATE
        """
    )

    print(
        "Added date_of_birth"
    )

else:

    print(
        "date_of_birth already exists"
    )


# =========================================================
# SAVE
# =========================================================

conn.commit()

conn.close()


print("--------------------------------")
print("Profile database updated.")
print("--------------------------------")