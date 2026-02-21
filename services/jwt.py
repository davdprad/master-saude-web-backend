from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os

JWT_SECRET = os.getenv("JWT_SECRET", "CHANGE_ME")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_ACCESS_EXPIRE_MINUTES = int(os.getenv("JWT_ACCESS_EXPIRE_MINUTES", "15"))

bearer_scheme = HTTPBearer(auto_error=False)

async def create_access_token(
    *,
    role: str,
    sub: str,
    company_id: Optional[int] = None,
    employee_id: Optional[int] = None,
    access_level: Optional[int] = None,
) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": sub,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=JWT_ACCESS_EXPIRE_MINUTES)).timestamp()),
    }
    if company_id is not None:
        payload["company_id"] = company_id
    if employee_id is not None:
        payload["employee_id"] = employee_id
    if access_level is not None:
        payload["access_level"] = access_level

    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
        )

def require_role(allowed: set[str]):
    async def dep(creds: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
        if not creds or not creds.credentials:
            raise HTTPException(status_code=401, detail="Token ausente")
        payload = await decode_token(creds.credentials)
        if payload.get("role") not in allowed:
            raise HTTPException(status_code=403, detail="Acesso não permitido")
        return payload
    return dep

require_master = require_role({"master"})
require_convenio = require_role({"convenio"})
require_cliente = require_role({"cliente"})
