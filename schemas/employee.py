from pydantic import BaseModel
from typing import List

class Employee(BaseModel):
    NidFuncionario: int
    NomFuncionario: str
    DesCPF: str
    DesSetor: str
    DesFuncao: str

class EmployeeList(BaseModel):
    employees: List[Employee]
