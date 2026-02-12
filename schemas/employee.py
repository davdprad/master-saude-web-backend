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
    NidAnexo: Optional[int] = None
    NomExame: Optional[str] = None
    DesAnexo: Optional[str] = None
    DesEmpresa: Optional[str] = None
    DatProcedimento: Optional[str] = None

class EmployeeExamGrouped(BaseModel):
    NidFuncionario: int
    NomFuncionario: str
    DesCPF: str
    NidEmpresa: int
    DesEmpresa: str
    exames: List[EmployeeExam]
