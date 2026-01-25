# Guia de Integração Front-end

Este documento descreve como consumir os endpoints da API, com foco na listagem e filtragem de colaboradores.

## Rota: Listagem de Colaboradores (Master User)

Esta rota retorna uma lista paginada de colaboradores de todas as empresas, permitindo filtragem por diversos campos.

**Endpoint:** `/masteruser-colaboradores-dados`  
**Método:** `GET`

### Parâmetros de Consulta (Query Parameters)

| Parâmetro | Tipo | Obrigatório | Padrão | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `page` | `int` | Não | `1` | Número da página atual para paginação. |
| `limit` | `int` | Não | `10` | Quantidade de registros por página. |
| `nome` | `string` | Não | `null` | Filtra colaboradores cujo nome contenha o texto informado. |
| `empresa` | `string` | Não | `null` | Filtra colaboradores cuja **empresa** contenha o texto informado. |
| `cpf` | `string` | Não | `null` | Filtra colaboradores cujo CPF contenha o texto informado. |
| `status` | `int` | Não | `null` | Filtra pelo status numérico do banco (`FlgAtivo`). |

### Exemplo de Requisição

Para buscar colaboradores da empresa "Saude", na página 1, exibindo 20 resultados:

```http
GET /masteruser-colaboradores-dados?page=1&limit=20&empresa=Saude
```

Com múltiplos filtros (Nome "João" na empresa "Tech"):

```http
GET /masteruser-colaboradores-dados?page=1&limit=10&nome=João&empresa=Tech
```

### Estrutura da Resposta

A API retorna um objeto JSON contendo a lista de funcionários (`employees`) e o total de registros encontrados (`total`) para fins de paginação no front-end.

```json
{
  "employees": [
    {
      "NidFuncionario": 101,
      "NomFuncionario": "João da Silva",
      "DesCPF": "123.456.789-00",
      "DesSetor": "Operacional",
      "DesFuncao": "Analista",
      "DesEmpresa": "Master Saude Ltda",
      "NidEmpresa": 5,
      "FlgAtivo": 10,
      "status": "Ativo"
    },
    {
      "NidFuncionario": 102,
      "NomFuncionario": "Maria Oliveira",
      "DesCPF": "987.654.321-11",
      "DesSetor": "Administrativo",
      "DesFuncao": "Gerente",
      "DesEmpresa": "Tech Solutions",
      "NidEmpresa": 8,
      "FlgAtivo": 0,
      "status": "Inativo"
    }
  ],
  "total": 45
}
```

### Notas para o Desenvolvedor Front-end

1.  **Debounce**: Ao implementar os filtros de texto (`nome`, `empresa`, `cpf`), recomenda-se usar um *debounce* (atraso na requisição) de ~500ms para evitar chamadas excessivas à API enquanto o usuário digita.
2.  **Paginação**: Utilize o campo `total` retornado para calcular o número de páginas disponíveis na interface (Total / Limit).
3.  **Status**: O campo `status` no objeto de retorno já vem formatado como "Ativo" ou "Inativo" baseado na regra de negócio, mas para filtrar via parâmetro, envie o valor numérico correspondente ao `FlgAtivo`.

---