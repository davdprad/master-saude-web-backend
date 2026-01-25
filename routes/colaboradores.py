from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from typing import List, Optional
import os

from services.database import get_all_employees, get_employee_exams, get_exam_file_path
from schemas.employee import EmployeeList, EmployeeExam

router = APIRouter()

@router.get("/masteruser-colaboradores-dados", response_model=EmployeeList)
def get_colaboradores_dados(
    page: int = 1, 
    limit: int = 10, 
    nome: Optional[str] = None, 
    empresa: Optional[str] = None,
    cpf: Optional[str] = None,
    status: Optional[int] = None
):
    skip = (page - 1) * limit
    employees, counters = get_all_employees(skip=skip, limit=limit, nome=nome, empresa=empresa, cpf=cpf, status=status)
    return {
        "employees": employees, 
        "total": counters['total'],
        "total_ativos": counters['total_ativos'],
        "total_inativos": counters['total_inativos']
    }

@router.get("/funcionario/{nid_funcionario}/exames", response_model=List[EmployeeExam])
def get_funcionario_exames(nid_funcionario: int):
    exams = get_employee_exams(nid_funcionario)
    return exams

@router.get("/exame/download/{nid_anexo}")
def download_exame(nid_anexo: int):
    filename = get_exam_file_path(nid_anexo)
    
    if not filename:
        raise HTTPException(status_code=404, detail="Registro do exame não encontrado.")

    exams_folder = r"C:\Users\Rikellme\Desktop\master-saude-web-backend\exames"
    file_path = os.path.join(exams_folder, os.path.basename(filename))
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Arquivo de exame não encontrado.")
    
    return FileResponse(file_path)