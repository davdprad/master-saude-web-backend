from pydantic import BaseModel
from typing import List, Optional

class Employee(BaseModel):
    NidFuncionario: int
    NomFuncionario: str
    DesCPF: str
    DesSetor: str
    DesFuncao: str
    DesEmpresa: str
    NidEmpresa: int
    FlgAtivo: int
    status: str
    DatASO: Optional[str] = None

class EmployeeList(BaseModel):
    employees: List[Employee]
    total: int
    total_ativos: int
    total_inativos: int

class EmployeeExam(BaseModel):
    NidAnexo: int
    NomExame: str
    DesAnexo: str
