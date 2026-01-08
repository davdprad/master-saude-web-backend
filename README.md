# API de Gerenciamento de Funcionários, Empresas e Exames

Esta é uma API REST desenvolvida com FastAPI para gerenciar funcionários, empresas e exames médicos. A API permite consultar funcionários ativos de uma empresa específica, incluindo suas informações pessoais, setores e funções.

## Funcionalidades

- **Consulta de Funcionários por Empresa**: Obter lista de funcionários ativos de uma empresa, com nomes, CPFs, setores e funções.
- Estrutura modular seguindo boas práticas de desenvolvimento:
  - `services/`: Lógica de negócio e acesso ao banco de dados.
  - `schemas/`: Modelos Pydantic para validação e serialização.
  - `routes/`: Definição dos endpoints da API.

## Tecnologias Utilizadas

- **FastAPI**: Framework para construção da API.
- **MariaDB**: Banco de dados relacional.
- **Pydantic**: Validação de dados.
- **Uvicorn**: Servidor ASGI para execução da API.
- **python-dotenv**: Gerenciamento de variáveis de ambiente.

## Instalação

1. Clone o repositório:
   ```bash
   git clone <url-do-repositorio>
   cd master-saude-web-backend
   ```

2. Crie um ambiente virtual:
   ```bash
   python -m venv .venv
   .\.venv\Scripts\activate  # Windows
   ```

3. Instale as dependências:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure as variáveis de ambiente no arquivo `.env` (baseie-se no `.env.example`).

5. Execute a API:
   ```bash
   uvicorn main:app --reload
   ```

## Uso

Acesse a documentação interativa em `http://127.0.0.1:8000/docs`.

### Endpoint Principal

- `GET /empresa/{nid_empresa}/funcionarios`: Retorna a lista de funcionários ativos da empresa especificada.

Exemplo de resposta:
```json
{
  "employees": [
    {
      "NidFuncionario": 1,
      "NomFuncionario": "João Silva",
      "DesCPF": "12345678901",
      "DesSetor": "Administrativo",
      "DesFuncao": "Gerente"
    }
  ]
}
```

## Estrutura do Projeto

```
.
├── main.py                 # Ponto de entrada da aplicação
├── routes/                 # Definição dos endpoints
│   └── employees.py
├── schemas/                # Modelos Pydantic
│   └── employee.py
├── services/               # Lógica de negócio
│   └── database.py
├── .env                    # Variáveis de ambiente (não versionado)
├── .env.example            # Exemplo de variáveis de ambiente
├── .gitignore              # Arquivos ignorados pelo Git
└── README.md               # Este arquivo
```
