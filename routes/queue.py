from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from services.database import (
    add_patient_to_queue,
    get_next_patient,
    update_queue_status,
    get_queue_list,
    get_db_connection
)

router = APIRouter(prefix="/fila", tags=["Fila"])

# --- Models Pydantic ---
class QueueItemCreate(BaseModel):
    nid_empresa: int
    nome_paciente: str
    cpf: str
    rg: Optional[str] = None
    data_nascimento: str # Formato esperado: YYYY-MM-DD
    tipo_fila: str  # Ex: 'TRIAGEM', 'RECEPCAO'
    prioridade: bool = False
    nid_funcionario: Optional[int] = None

class QueueStatusUpdate(BaseModel):
    status: str # 'CHAMADO', 'ATENDIDO', 'CANCELADO', 'EM_ATENDIMENTO'

# --- Endpoints ---

@router.post("/adicionar")
def adicionar_na_fila(item: QueueItemCreate):
    try:
        nid_fila = add_patient_to_queue(
            nid_empresa=item.nid_empresa,
            nome_paciente=item.nome_paciente,
            cpf=item.cpf,
            rg=item.rg,
            data_nascimento=item.data_nascimento,
            tipo_fila=item.tipo_fila,
            prioridade=item.prioridade,
            nid_funcionario=item.nid_funcionario
        )
        return {
            "message": "Cadastro realizado com sucesso", 
            "nid_fila": nid_fila,
            "paciente": item.nome_paciente
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/listar/{nid_empresa}")
def listar_fila(nid_empresa: int, tipo_fila: Optional[str] = None):
    try:
        items = get_queue_list(nid_empresa, tipo_fila)
        return items
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chamar-proximo/{nid_empresa}/{tipo_fila}")
def chamar_proximo(nid_empresa: int, tipo_fila: str):
    try:
        # Busca o próximo
        next_patient = get_next_patient(nid_empresa, tipo_fila)
        
        if not next_patient:
            raise HTTPException(status_code=404, detail="Não há pacientes aguardando nesta fila.")
        
        # Atualiza status para CHAMADO
        update_queue_status(next_patient['NidFila'], 'CHAMADO')
        
        return {
            "message": "Próximo paciente chamado",
            "paciente": next_patient
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{nid_fila}/status")
def atualizar_status(nid_fila: int, status_data: QueueStatusUpdate):
    try:
        update_queue_status(nid_fila, status_data.status)
        return {"message": f"Status atualizado para {status_data.status}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))