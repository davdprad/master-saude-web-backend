from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from services.database import get_employees_by_company, get_all_employee_exams_grouped, get_all_employees, get_employee_exams, get_exam_file_path, get_companies_with_employee_count
from schemas.employee import EmployeeList, EmployeeExamGrouped, EmployeeExam
from fastapi.responses import FileResponse
from services.jwt import require_role
from dotenv import load_dotenv
import os

load_dotenv()
exams_path = os.getenv('EXAMS_PATH')

router = APIRouter()

@router.get("/empresa/{nid_empresa}/funcionarios", response_model=EmployeeList)
async def get_employees(
    nid_empresa: int,
    _payload=Depends(require_role({"master", "convenio"})),
):
    try:
        employees, counters = get_employees_by_company(nid_empresa)
        return {
            "employees": employees, 
            "total": counters['total'],
            "total_ativos": counters['total_ativos'],
            "total_inativos": counters['total_inativos']
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/funcionarios-exames-agrupados", response_model=List[EmployeeExamGrouped])
async def get_employees_exams_grouped(
    nid_empresa: Optional[int] = None,
    nid_funcionario: Optional[int] = None,
    page: int = 1, 
    limit: int = 10,
    nome: Optional[str] = None,
    empresa: Optional[str] = None,
    cpf: Optional[str] = None,
    status: Optional[int] = None,
    _payload=Depends(require_role({"master", "convenio"})),
):
    try:
        skip = (page - 1) * limit
        employees, _ = get_all_employee_exams_grouped(
            skip=skip, 
            limit=limit, 
            nid_empresa=nid_empresa,
            nid_funcionario=nid_funcionario,
            nome=nome,
            empresa=empresa,
            cpf=cpf,
            status=status
        )
        return employees
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/masteruser-colaboradores-dados", response_model=EmployeeList)
def get_colaboradores_dados(
    page: int = 1, 
    limit: int = 10, 
    nome: Optional[str] = None, 
    nidFuncionario: Optional[int] = None,
    empresa: Optional[str] = None,
    nidEmpresa: Optional[int] = None,
    cpf: Optional[str] = None,
    status: Optional[int] = None,
    _payload=Depends(require_role({"master", "convenio"})),
):
    skip = (page - 1) * limit
    employees, counters = get_all_employees(skip=skip, limit=limit, nome=nome, nidFuncionario=nidFuncionario, empresa=empresa, nidEmpresa=nidEmpresa, cpf=cpf, status=status)
    return {
        "employees": employees, 
        "total": counters['total'],
        "total_ativos": counters['total_ativos'],
        "total_inativos": counters['total_inativos']
    }

@router.get("/funcionario/{nid_funcionario}/exames", response_model=List[EmployeeExam])
def get_funcionario_exames(
    nid_funcionario: int, 
    nid_empresa: Optional[int] = None,
    _payload=Depends(require_role({"master", "convenio", "cliente"})),
):
    exams = get_employee_exams(nid_funcionario, nid_empresa)
    return exams

@router.get("/exame/download/{nid_anexo}")
def download_exame(
    nid_anexo: int,
    _payload=Depends(require_role({"master", "convenio", "cliente"})),
):
    filename = get_exam_file_path(nid_anexo)
    
    if not filename:
        raise HTTPException(status_code=404, detail="Registro do exame não encontrado.")

    file_path = os.path.join(exams_path, os.path.basename(filename))
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Arquivo de exame não encontrado.")
    
    return FileResponse(file_path)

@router.get("/empresas")
def get_empresas_dados(
    page: int = 1, 
    limit: int = 10, 
    empresa: Optional[str] = None,
    status: Optional[int] = None,
    _payload=Depends(require_role({"master"})),
):
    skip = (page - 1) * limit
    companies, counters = get_companies_with_employee_count(skip=skip, limit=limit, empresa=empresa, status=status)
    return {
        "companies": companies, 
        "total": counters['total']
    }
