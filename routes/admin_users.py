import asyncio
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Optional
from schemas.admin_auth import (
    CreateMasterUserRequest,
    CreateCompanyLoginRequest,
    CreateEmployeeLoginRequest,
    CreatedLoginResponse,
    DeleteLoginResponse,
    RegisteredLoginUserList,
)
from services.jwt import require_master
from services.security import hash_password
from services import database as db

router = APIRouter()

@router.get("/usuarios", response_model=RegisteredLoginUserList)
async def list_registered_users(
    page: int = 1,
    limit: int = 10,
    login: Optional[str] = None,
    role: Optional[str] = None,
    _payload=Depends(require_master),
):
    try:
        skip = (page - 1) * limit
        users, counters = await asyncio.to_thread(
            db.get_registered_logins,
            skip,
            limit,
            login,
            role,
        )
        return {
            "users": users,
            "total": counters["total"],
        }
    except Exception:
        raise HTTPException(status_code=500, detail="Erro ao listar usuários cadastrados")

@router.post("/usuarios/{user_id}/excluir", response_model=DeleteLoginResponse)
async def delete_registered_user(
    user_id: int,
    _payload=Depends(require_master),
):
    try:
        await asyncio.to_thread(db.delete_registered_login, user_id)
        return {"message": "Usuário excluído com sucesso"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Erro ao excluir usuário")

@router.post("/master", response_model=CreatedLoginResponse)
async def create_master_user(
    request: Request,
    body: CreateMasterUserRequest,
    _payload=Depends(require_master),
):
    try:
        senha_hash = await hash_password(body.senha)

        # roda em thread porque mysql.connector é sync
        new_id = await asyncio.to_thread(db.create_master_login, body.login, senha_hash)

        return CreatedLoginResponse(
            id=new_id,
            login=body.login,
            role="master",
        )
    except ValueError as e:
        msg = str(e)
        status_code = 409 if "Login já" in msg else 400
        raise HTTPException(status_code=status_code, detail=msg)
    except Exception:
        raise HTTPException(status_code=500, detail="Erro ao cadastrar usuário master")

@router.post("/convenio", response_model=CreatedLoginResponse)
async def create_company_login(
    body: CreateCompanyLoginRequest,
    _payload=Depends(require_master),
):
    try:
        senha_hash = await hash_password(body.senha)

        new_id = await asyncio.to_thread(
            db.create_company_login,
            body.login,
            senha_hash,
            body.company_id,
            body.access_level
        )

        return CreatedLoginResponse(
            id=new_id,
            login=body.login,
            role="convenio",
            company_id=body.company_id,
        )

    except ValueError as e:
        msg = str(e)
        if "Login já" in msg:
            raise HTTPException(status_code=409, detail=msg)
        if "Empresa não encontrada" in msg:
            raise HTTPException(status_code=404, detail=msg)
        raise HTTPException(status_code=400, detail=msg)

    except Exception:
        raise HTTPException(status_code=500, detail="Erro ao cadastrar login do convênio")

@router.post("/cliente", response_model=CreatedLoginResponse)
async def create_employee_login(
    body: CreateEmployeeLoginRequest,
    _payload=Depends(require_master),
):
    try:
        senha_hash = await hash_password(body.senha)

        new_id = await asyncio.to_thread(
            db.create_employee_login,
            body.login,
            senha_hash,
            body.employee_id,
            body.company_id,
        )

        return CreatedLoginResponse(
            id=new_id,
            login=body.login,
            role="cliente",
            employee_id=body.employee_id,
            company_id=body.company_id,
        )

    except ValueError as e:
        msg = str(e)
        if "em uso" in msg:
            raise HTTPException(status_code=409, detail=msg)
        if "não encontrado" in msg:
            raise HTTPException(status_code=404, detail=msg)
        if "não vinculado" in msg:
            raise HTTPException(status_code=400, detail=msg)
        raise HTTPException(status_code=400, detail=msg)
    except Exception:
        raise HTTPException(status_code=500, detail="Erro ao cadastrar login do cliente")
