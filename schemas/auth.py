from pydantic import BaseModel
from typing import Optional

class LoginRequest(BaseModel):
    login: str
    senha: str

class RefreshRequest(BaseModel):
    refresh_id: int
    refresh_token: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    refresh_expires_at: Optional[int] = None
    refresh_id: Optional[int] = None
    token_type: str = "bearer"
    role: str
    company_id: Optional[int] = None
    employee_id: Optional[int] = None
