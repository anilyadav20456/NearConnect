from sqlalchemy import text
import app


print()
print("========================================")
print("   NearConnect Database Repair")
print("========================================")


with app.app.app_context():

    # =====================================================
    # USE EXACT DATABASE FLASK IS USING
    # =====================================================

    engine = app.db.engine

    print("Flask database:")
    print(engine.url)


    # =====================================================
    # CHECK TABLES
    # =====================================================

    with engine.connect() as connection:

        result = connection.execute(
            text(
                "SELECT name "
                "FROM sqlite_master "
                "WHERE type='table' "
                "ORDER BY name"
            )
        )

        tables = [
            row[0]
            for row in result.fetchall()
        ]


    print()
    print("Existing tables:")

    for table in tables:
        print(" -", table)


    # =====================================================
    # USERS TABLE
    # =====================================================

    if "users" not in tables:

        print()
        print("ERROR: users table does not exist.")
        print("The database currently used by Flask has no users table.")
        raise SystemExit(1)


    print()
    print("users table found.")


    # =====================================================
    # CURRENT COLUMNS
    # =====================================================

    with engine.connect() as connection:

        result = connection.execute(
            text(
                "PRAGMA table_info(users)"
            )
        )

        rows = result.fetchall()


    existing_columns = {
        row[1]
        for row in rows
    }


    print()
    print("Current users columns:")

    for column in sorted(existing_columns):

        print(" -", column)


    # =====================================================
    # REQUIRED COLUMNS
    # =====================================================

    migrations = [

        (
            "profile_image",
            "ALTER TABLE users "
            "ADD COLUMN profile_image "
            "VARCHAR(500) DEFAULT ''"
        ),

        (
            "show_online_status",
            "ALTER TABLE users "
            "ADD COLUMN show_online_status "
            "BOOLEAN DEFAULT 1"
        ),

        (
            "language",
            "ALTER TABLE users "
            "ADD COLUMN language "
            "VARCHAR(10) DEFAULT 'en'"
        ),

        (
            "default_radius",
            "ALTER TABLE users "
            "ADD COLUMN default_radius "
            "INTEGER DEFAULT 2"
        )

    ]


    # =====================================================
    # APPLY MIGRATIONS
    # =====================================================

    for column_name, sql in migrations:

        if column_name in existing_columns:

            print(
                f"Already exists: {column_name}"
            )

        else:

            print(
                f"Adding: {column_name}"
            )

            with engine.begin() as connection:

                connection.execute(
                    text(sql)
                )


    # =====================================================
    # CREATE MISSING TABLES
    # =====================================================

    print()
    print("Checking tables...")

    app.db.create_all()

    print("Database tables verified.")


    # =====================================================
    # VERIFY AYAZ123
    # =====================================================

    with engine.connect() as connection:

        result = connection.execute(
            text(
                "SELECT id, username "
                "FROM users "
                "WHERE username = :username"
            ),
            {
                "username": "ayaz123"
            }
        )

        user = result.fetchone()


    print()

    if user:

        print(
            "Account found:",
            user
        )

    else:

        print(
            "WARNING: ayaz123 was not found."
        )


    # =====================================================
    # FINAL COLUMNS
    # =====================================================

    with engine.connect() as connection:

        result = connection.execute(
            text(
                "PRAGMA table_info(users)"
            )
        )

        final_columns = [
            row[1]
            for row in result.fetchall()
        ]


    print()
    print("Final users columns:")

    for column in final_columns:

        print(" -", column)


print()
print("========================================")
print("DATABASE REPAIR COMPLETE")
print("========================================")