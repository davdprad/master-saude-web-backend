from fastapi import FastAPI
from routes.employees import router as employees_router
from routes.colaboradores import router as colaboradores_router

app = FastAPI(title="Empresa API", version="1.0.0")

app.include_router(employees_router)
app.include_router(colaboradores_router)

@app.get("/")
async def root():
    return {"message": "API de Empresas e Funcionários", "docs": "/docs"}
