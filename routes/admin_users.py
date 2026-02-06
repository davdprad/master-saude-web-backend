import asyncio
from fastapi import APIRouter, Depends, HTTPException
from schemas.admin_auth import (
    CreateMasterUserRequest,
    CreateCompanyLoginRequest,
    CreateEmployeeLoginRequest,
    CreatedLoginResponse,
)
from services.jwt import require_master
from services.security import hash_password
from services import database as db

router = APIRouter()

@router.post("/users/master", response_model=CreatedLoginResponse)
async def create_master_user(
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

@router.post("/convenios/master", response_model=CreatedLoginResponse)
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

@router.post("/clientes/master", response_model=CreatedLoginResponse)
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
        if "Login já" in msg:
            raise HTTPException(status_code=409, detail=msg)
        if "Funcionário não encontrado" in msg:
            raise HTTPException(status_code=404, detail=msg)
        if "não vinculado" in msg:
            raise HTTPException(status_code=400, detail=msg)
        raise HTTPException(status_code=400, detail=msg)

    except Exception:
        raise HTTPException(status_code=500, detail="Erro ao cadastrar login do cliente")
