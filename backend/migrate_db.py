import sqlite3
import os

DB_PATH = os.path.join(
    os.path.dirname(__file__),
    "nearconnect.db"
)

print("Database:", DB_PATH)
print("Exists:", os.path.exists(DB_PATH))

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Show existing tables
cursor.execute(
    "SELECT name FROM sqlite_master WHERE type='table'"
)

tables = cursor.fetchall()

print("Tables:")
for table in tables:
    print(" -", table[0])


# Check users table
cursor.execute(
    "SELECT name FROM sqlite_master "
    "WHERE type='table' AND name='users'"
)

users_table = cursor.fetchone()


if not users_table:

    print("\nERROR: users table does not exist.")
    print("This is not the database containing your old account.")

else:

    print("\nUsers table found.")

    cursor.execute(
        "PRAGMA table_info(users)"
    )

    columns = cursor.fetchall()

    existing_columns = {
        column[1]
        for column in columns
    }

    print(
        "Existing users columns:",
        list(existing_columns)
    )


    migrations = [

        (
            "profile_image",
            "ALTER TABLE users "
            "ADD COLUMN profile_image VARCHAR(500) "
            "DEFAULT ''"
        ),

        (
            "show_online_status",
            "ALTER TABLE users "
            "ADD COLUMN show_online_status BOOLEAN "
            "DEFAULT 1"
        ),

        (
            "language",
            "ALTER TABLE users "
            "ADD COLUMN language VARCHAR(10) "
            "DEFAULT 'en'"
        ),

        (
            "default_radius",
            "ALTER TABLE users "
            "ADD COLUMN default_radius INTEGER "
            "DEFAULT 2"
        ),

        (
            "reset_otp",
            "ALTER TABLE users "
            "ADD COLUMN reset_otp VARCHAR(6)"
        ),

        (
            "reset_otp_expires",
            "ALTER TABLE users "
            "ADD COLUMN reset_otp_expires DATETIME"
        )

    ]


    for column_name, sql in migrations:

        if column_name not in existing_columns:

            print(
                f"Adding column: {column_name}"
            )

            cursor.execute(sql)

        else:

            print(
                f"Already exists: {column_name}"
            )


    conn.commit()


    # Verify
    cursor.execute(
        "PRAGMA table_info(users)"
    )

    final_columns = [
        column[1]
        for column in cursor.fetchall()
    ]


    print(
        "\nFinal users columns:"
    )

    for column in final_columns:
        print(
            " -",
            column
        )


    # Check your account
    try:

        cursor.execute(
            "SELECT id, username "
            "FROM users "
            "WHERE username = ?",
            ("ayaz123",)
        )

        user = cursor.fetchone()

        print(
            "\nAccount ayaz123:",
            user
        )

    except Exception as error:

        print(
            "\nCould not check ayaz123:",
            error
        )


conn.close()

print("\nMigration finished.")