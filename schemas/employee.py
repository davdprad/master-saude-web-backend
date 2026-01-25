from pydantic import BaseModel
from typing import List

class Employee(BaseModel):
    NidFuncionario: int
    NomFuncionario: str
    DesCPF: str
    DesSetor: str
    DesFuncao: str
    NidEmpresa: int
    FlgAtivo: int
    status: str

class EmployeeList(BaseModel):
    employees: List[Employee]
    total: int

class EmployeeExam(BaseModel):
    NidAnexo: int
    NomExame: str
    DesAnexo: str
