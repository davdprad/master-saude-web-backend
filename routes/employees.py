from fastapi import APIRouter, HTTPException
from services.database import get_employees_by_company
from schemas.employee import EmployeeList

router = APIRouter()

@router.get("/empresa/{nid_empresa}/funcionarios", response_model=EmployeeList)
async def get_employees(nid_empresa: int):
    try:
        employees = get_employees_by_company(nid_empresa)
        return {"employees": employees, "total": len(employees)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
