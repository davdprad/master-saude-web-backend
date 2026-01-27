from fastapi import APIRouter, HTTPException
from typing import List, Optional
from services.database import get_employees_by_company, get_all_employee_exams_grouped
from schemas.employee import EmployeeList, EmployeeExamGrouped

router = APIRouter()

@router.get("/empresa/{nid_empresa}/funcionarios", response_model=EmployeeList)
async def get_employees(nid_empresa: int):
    try:
        employees = get_employees_by_company(nid_empresa)
        return {"employees": employees, "total": len(employees)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/funcionarios-exames-agrupados", response_model=List[EmployeeExamGrouped])
async def get_employees_exams_grouped(
    nid_empresa: Optional[int] = None, 
    page: int = 1, 
    limit: int = 10,
    nome: Optional[str] = None,
    empresa: Optional[str] = None,
    cpf: Optional[str] = None,
    status: Optional[int] = None
):
    try:
        skip = (page - 1) * limit
        employees, counters = get_all_employee_exams_grouped(
            skip=skip, 
            limit=limit, 
            nid_empresa=nid_empresa,
            nome=nome,
            empresa=empresa,
            cpf=cpf,
            status=status
        )
        return employees
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
