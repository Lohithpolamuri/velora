from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def ensure_columns(engine: Engine) -> None:
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())

    with engine.begin() as connection:
        if "users" in tables:
            cols = {c["name"] for c in inspector.get_columns("users")}

            if "is_verified" not in cols:
                connection.execute(
                    text(
                        "ALTER TABLE users ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT 0"
                    )
                )

            if "verified_at" not in cols:
                connection.execute(
                    text("ALTER TABLE users ADD COLUMN verified_at DATETIME")
                )

        if "sessions" in tables:
            cols = {c["name"] for c in inspector.get_columns("sessions")}

            if "last_seen_at" not in cols:
                connection.execute(
                    text("ALTER TABLE sessions ADD COLUMN last_seen_at DATETIME")
                )

                connection.execute(
                    text(
                        "UPDATE sessions "
                        "SET last_seen_at = created_at "
                        "WHERE last_seen_at IS NULL"
                    )
                )