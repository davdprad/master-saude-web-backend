from pydantic import BaseModel, Field
from typing import Optional

class CreateMasterUserRequest(BaseModel):
    login: str = Field(min_length=3, max_length=100)
    senha: str = Field(min_length=8, max_length=128)

class CreateCompanyLoginRequest(BaseModel):
    login: str = Field(min_length=3, max_length=100)
    senha: str = Field(min_length=8, max_length=128)
    company_id: int
    access_level: int

class CreateEmployeeLoginRequest(BaseModel):
    login: str = Field(min_length=3, max_length=100)
    senha: str = Field(min_length=8, max_length=128)
    employee_id: int
    company_id: int

class CreatedLoginResponse(BaseModel):
    id: int
    login: str
    role: str
    company_id: Optional[int] = None
    employee_id: Optional[int] = None
