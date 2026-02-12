from pydantic import BaseModel
from typing import Optional

class LoginRequest(BaseModel):
    login: str
    senha: str

class TokenResponse(BaseModel):
    access_token: str
    access_token_expire: int
    token_type: str = "bearer"
    role: str
    login: str
    company_id: Optional[int] = None
    employee_id: Optional[int] = None
