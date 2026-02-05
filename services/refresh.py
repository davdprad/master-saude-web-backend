import os, secrets
from datetime import datetime, timedelta, timezone
from services.security import hash_password_sync, verify_password_sync
from services import database as db

JWT_REFRESH_EXPIRE_HOURS = int(os.getenv("JWT_REFRESH_EXPIRE_HOURS", "12"))

def issue_refresh_token_sync(nid_auth: int) -> dict:
    token_plain = secrets.token_urlsafe(64)
    token_hash = hash_password_sync(token_plain)

    expires_at = datetime.now(timezone.utc) + timedelta(hours=JWT_REFRESH_EXPIRE_HOURS)
    refresh_id = db.insert_refresh_token(nid_auth, token_hash, expires_at.replace(tzinfo=None))

    return {
        "refresh_token": token_plain,
        "refresh_expires_at": int(expires_at.timestamp()),
        "refresh_id": refresh_id,
    }

def verify_refresh_token_sync(nid_auth: int, refresh_token_plain: str) -> int | None:
    rows = db.get_active_refresh_tokens_by_user(nid_auth)
    for r in rows:
        if verify_password_sync(refresh_token_plain, r["RefreshTokenHash"]):
            return int(r["NidRefreshToken"])
    return None

def verify_refresh_token_by_id_sync(refresh_id: int, refresh_token_plain: str) -> int | None:
    row = db.get_refresh_token_by_id(refresh_id)
    if not row:
        return None
    if int(row.get("FlgRevoked", 1)) == 1:
        return None

    expires_at = row.get("DatExpiresAt")
    if not expires_at:
        return None
    if expires_at <= datetime.utcnow():
        return None

    if not verify_password_sync(refresh_token_plain, row["RefreshTokenHash"]):
        return None

    return int(row["NidLogin"])
