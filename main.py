from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.employees import router as employees_router
from routes.admin_users import router as admin_users_router
from routes.auth import router as auth_router

app = FastAPI(title="Empresa API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://192.168.15.6:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(employees_router, tags=["Rotas de dados"])
app.include_router(admin_users_router, prefix="/register", tags=["Registro de usuários"])
app.include_router(auth_router, prefix="/auth", tags=["Autenticação"])

@app.get("/")
async def root():
    return {"message": "API de Empresas e Funcionários", "docs": "/docs"}
