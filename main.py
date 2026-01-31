from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.employees import router as employees_router
from routes.colaboradores import router as colaboradores_router

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

app.include_router(employees_router)
app.include_router(colaboradores_router)

@app.get("/")
async def root():
    return {"message": "API de Empresas e Funcionários", "docs": "/docs"}
