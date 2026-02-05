import asyncio
from fastapi import APIRouter, HTTPException
from schemas.auth import LoginRequest, RefreshRequest, TokenResponse
from services.jwt import create_access_token
from services.refresh import issue_refresh_token_sync, verify_refresh_token_by_id_sync
from services.security import verify_password
from services import database as db

router = APIRouter()

@router.post("/master/login", response_model=TokenResponse)
async def login_master(body: LoginRequest):
    # Busca no banco (em thread)
    row = await asyncio.to_thread(db.get_master_login_by_login, body.login)

    if not row:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    ok = await verify_password(body.senha, row["senha_hash"])
    if not ok:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    token = await create_access_token(role="master", sub=f"master:{row['id']}")
    refresh = await asyncio.to_thread(issue_refresh_token_sync, int(row["id"]))

    return TokenResponse(
        access_token=token,
        refresh_token=refresh["refresh_token"],
        refresh_expires_at=refresh["refresh_expires_at"],
        refresh_id=refresh["refresh_id"],
        role="master",
    )

@router.post("/convenio/login", response_model=TokenResponse)
async def login_convenio(body: LoginRequest):
    row = await asyncio.to_thread(db.get_company_login_by_login, body.login)

    if not row:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    ok = await verify_password(body.senha, row["senha_hash"])
    if not ok:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    company_id = int(row["company_id"])

    token = await create_access_token(
        role="convenio",
        sub=f"company:{company_id}",
        company_id=company_id,
    )
    refresh = await asyncio.to_thread(issue_refresh_token_sync, int(row["id"]))
    return TokenResponse(
        access_token=token,
        refresh_token=refresh["refresh_token"],
        refresh_expires_at=refresh["refresh_expires_at"],
        refresh_id=refresh["refresh_id"],
        role="convenio",
        company_id=company_id,
    )

@router.post("/cliente/login", response_model=TokenResponse)
async def login_cliente(body: LoginRequest):
    row = await asyncio.to_thread(db.get_employee_login_by_login, body.login)

    if not row:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    ok = await verify_password(body.senha, row["senha_hash"])
    if not ok:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    employee_id = int(row["employee_id"])
    company_id = int(row["company_id"]) if row.get("company_id") is not None else None

    token = await create_access_token(
        role="cliente",
        sub=f"employee:{employee_id}",
        employee_id=employee_id,
        company_id=company_id,
    )
    refresh = await asyncio.to_thread(issue_refresh_token_sync, int(row["id"]))
    return TokenResponse(
        access_token=token,
        refresh_token=refresh["refresh_token"],
        refresh_expires_at=refresh["refresh_expires_at"],
        refresh_id=refresh["refresh_id"],
        role="cliente",
        employee_id=employee_id,
        company_id=company_id,
    )

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshRequest):
    auth_row = await asyncio.to_thread(db.get_refresh_token_by_id, body.refresh_id)
    if not auth_row:
        raise HTTPException(status_code=401, detail="Refresh token inválido")

    refresh_id = await asyncio.to_thread(
        verify_refresh_token_by_id_sync,
        int(auth_row["id"]),
        body.refresh_token,
    )
    if not refresh_id:
        raise HTTPException(status_code=401, detail="Refresh token inválido")

    # Rotação: revoga o refresh usado e emite outro
    await asyncio.to_thread(db.revoke_refresh_token, int(refresh_id))
    refresh = await asyncio.to_thread(issue_refresh_token_sync, int(auth_row["id"]))

    role = auth_row["role"]
    company_id = auth_row.get("company_id")
    employee_id = auth_row.get("employee_id")

    if role == "master":
        sub = f"master:{auth_row['id']}"
    elif role == "convenio":
        sub = f"company:{company_id}"
    elif role == "employee":
        sub = f"employee:{employee_id}"

    token = await create_access_token(
        role=role,
        sub=sub,
        company_id=company_id,
        employee_id=employee_id,
    )

    return TokenResponse(
        access_token=token,
        refresh_token=refresh["refresh_token"],
        refresh_expires_at=refresh["refresh_expires_at"],
        refresh_id=refresh["refresh_id"],
        role=role,
        company_id=company_id,
        employee_id=employee_id,
    )
