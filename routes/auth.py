import asyncio
from fastapi import APIRouter, HTTPException
from schemas.auth import LoginRequest, TokenResponse
from services.jwt import create_access_token
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

    return TokenResponse(
        access_token=token,
        access_token_expire=28800,
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

    return TokenResponse(
        access_token=token,
        access_token_expire=28800,
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
    
    return TokenResponse(
        access_token=token,
        access_token_expire=28800,
        role="cliente",
        employee_id=employee_id,
        company_id=company_id,
    )
