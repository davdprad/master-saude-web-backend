# API de Gerenciamento de Funcionários, Empresas e Exames (NestJS)

Esta API foi migrada de FastAPI para **NestJS**, mantendo os mesmos endpoints e regras de negócio para funcionários, empresas, exames, autenticação e fila.

## Stack

- **NestJS**
- **TypeScript**
- **MariaDB/MySQL** (`mysql2`)
- **JWT** para autenticação por perfil (`master`, `convenio`, `cliente`)
- **bcrypt** para hash de senha

## Instalação

1. Instale dependências:

```bash
npm install
```

2. Configure o arquivo `.env` com as variáveis:

- `PORT` (opcional, padrão `3030`)
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_DATABASE`
- `JWT_SECRET`
- `JWT_ALGORITHM` (opcional, padrão `HS256`)
- `JWT_ACCESS_EXPIRE_MINUTES` (opcional, padrão `480`)
- `EXAMS_PATH` (opcional em dev; se ausente usa `./exames` automaticamente)
- `CORS_ALLOWED_ORIGINS` (opcional em dev, obrigatório em produção)

Exemplo para produção (`https`):

`CORS_ALLOWED_ORIGINS=https://seu-frontend.vercel.app,https://app.seudominio.com`

Comportamento atual:

- Em `development`: permite origens configuradas e, se não definir variável, usa localhost/rede local.
- Em `production`: aceita apenas origens `https://` e falha na inicialização se nenhuma origem HTTPS for configurada.

## Execução

Desenvolvimento:

```bash
npm run start:dev
```

Build de produção:

```bash
npm run build
npm run start:prod
```

## Endpoints mantidos

- `POST /auth/master/login`
- `POST /auth/convenio/login`
- `POST /auth/cliente/login`
- `GET /empresa/:nid_empresa/funcionarios`
- `GET /funcionarios-exames-agrupados`
- `GET /masteruser-colaboradores-dados`
- `GET /funcionario/:nid_funcionario/exames`
- `GET /exame/download/:nid_anexo`
- `GET /empresas`
- `GET /register/usuarios`
- `POST /register/usuarios/:user_id/excluir`
- `POST /register/master`
- `POST /register/convenio`
- `POST /register/cliente`
- `POST /fila/adicionar`
- `GET /fila/listar/:nid_empresa`
- `POST /fila/chamar-proximo/:nid_empresa/:tipo_fila`
- `PUT /fila/:nid_fila/status`

## Swagger

- UI: `/docs`
- OpenAPI JSON: `/docs-json`

## Estrutura atual

- `src/main.ts`: bootstrap NestJS + CORS
- `src/modules/database`: queries SQL e acesso ao banco
- `src/modules/auth`: login, JWT e segurança
- `src/modules/admin-users`: gestão de usuários cadastrados
- `src/modules/employees`: funcionários, exames e empresas
- `src/modules/queue`: fluxo de fila

