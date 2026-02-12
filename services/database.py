import mysql.connector
import pandas as pd
from dotenv import load_dotenv
from typing import Optional, Dict, Any
from datetime import datetime
from utils.cnpj_formatter import format_cnpj_cei
import os
import re

padrao_split = re.compile(r"\s*[_\-\u2013\u2014]\s*")

load_dotenv()

def get_db_connection():
    # Database connection parameters from .env
    host = os.getenv('DB_HOST')
    user = os.getenv('DB_USER')
    password = os.getenv('DB_PASSWORD')
    database = os.getenv('DB_DATABASE')
    port = os.getenv('DB_PORT')

    try:
        connection = mysql.connector.connect(
            host=host,
            user=user,
            password=password,
            database=database,
            port=port
        )
        return connection
    except mysql.connector.Error as e:
        raise Exception(f"Database connection error: {e}")

# =============== CONSULTA DOS DADOS PRINCIPAIS ===============

def get_employees_by_company(nid_empresa: int):
    connection = get_db_connection()
    try:
        query = """
        SELECT
            f.NidFuncionario,
            f.NomFuncionario,
            f.DesCPF,
            s.DesSetor,
            fu.DesFuncao,
            fe.NidEmpresa,
            eh.DesEmpresa,
            fe.FlgAtivo
        FROM smt_master.tfuncionario f
        INNER JOIN smt_master.tfuncionarioemp fe
            ON fe.NidFuncionario = f.NidFuncionario
        INNER JOIN (
            SELECT NidEmpresa, DesEmpresa
            FROM smt_master.tempresahist
            GROUP BY NidEmpresa, DesEmpresa
        ) eh
            ON eh.NidEmpresa = fe.NidEmpresa
        LEFT JOIN smt_master.tsetor s
            ON s.NidSetor = fe.NidSetor
        LEFT JOIN smt_master.tfuncao fu
            ON fu.NidFuncao = fe.NidFuncao
        WHERE fe.NidEmpresa = %s
        """

        df = pd.read_sql_query(query, connection, params=[nid_empresa])

        # Normaliza FlgAtivo (NULL -> 0) e cria status
        df["FlgAtivo"] = df["FlgAtivo"].fillna(0).astype(int)
        df["status"] = df["FlgAtivo"].apply(lambda x: "Ativo" if x == 1 else "Inativo")

        # Totais
        total = int(len(df))
        total_ativos = int((df["FlgAtivo"] == 1).sum())
        total_inativos = int((df["FlgAtivo"] == 0).sum())

        employees = df.to_dict("records")

        return employees, {
            'total': total,
            'total_ativos': total_ativos,
            'total_inativos': total_inativos
        }
    finally:
        connection.close()

def get_all_employees(
    skip: int = 0,
    limit: int = 10,
    nome: str = None,
    nidFuncionario: Optional[int] = None,
    empresa: Optional[str] = None,
    nidEmpresa: Optional[int] = None,
    cpf: str = None,
    status: int = None
):
    connection = get_db_connection()
    try:
        cursor = connection.cursor()

        # Base da query (JOINs CORRETOS)
        base_query = """
        FROM smt_master.tfuncionario f
        INNER JOIN smt_master.tfuncionarioemp fe
            ON fe.NidFuncionario = f.NidFuncionario
        INNER JOIN (
            SELECT NidEmpresa, DesEmpresa
            FROM smt_master.tempresahist
            GROUP BY NidEmpresa, DesEmpresa
        ) eh
            ON eh.NidEmpresa = fe.NidEmpresa
        LEFT JOIN smt_master.tsetor s
            ON s.NidSetor = fe.NidSetor
        LEFT JOIN smt_master.tfuncao fu
            ON fu.NidFuncao = fe.NidFuncao
        LEFT JOIN (
            SELECT 
                a1.NidFuncionario,
                a1.NidEmpresa,
                MIN(a1.DatASO) as DatASO
            FROM smt_master.taso a1
            WHERE a1.TipASO IN (1, 2)
            GROUP BY a1.NidFuncionario, a1.NidEmpresa
        ) a ON a.NidFuncionario = f.NidFuncionario AND a.NidEmpresa = fe.NidEmpresa
        """

        # Filtros dinâmicos
        where_clauses = []
        params = []

        if nome:
            where_clauses.append("f.NomFuncionario LIKE %s")
            params.append(f"%{nome}%")

        if nidFuncionario:
            where_clauses.append("f.NidFuncionario LIKE %s")
            params.append(f"{nidFuncionario}")

        if empresa:
            where_clauses.append("eh.DesEmpresa LIKE %s")
            params.append(f"%{empresa}%")

        if nidEmpresa:
            where_clauses.append("fe.NidEmpresa LIKE %s")
            params.append(f"{nidEmpresa}")

        if cpf:
            where_clauses.append("f.DesCPF LIKE %s")
            params.append(f"%{cpf}%")

        if status is not None:
            where_clauses.append("fe.FlgAtivo = %s")
            params.append(status)

        where_str = ""
        if where_clauses:
            where_str = "WHERE " + " AND ".join(where_clauses)

        # 🔹 COUNT correto (sem multiplicação)
        count_query = f"""
            SELECT COUNT(DISTINCT f.NidFuncionario)
            {base_query}
            {where_str}
        """
        cursor.execute(count_query, tuple(params))
        total_count = cursor.fetchone()[0]

        # 🔹 Contagem de colaboradores ativos
        count_ativos_query = f"""
            SELECT COUNT(DISTINCT f.NidFuncionario)
            {base_query}
            {where_str}
            {"AND" if where_str else "WHERE"} fe.FlgAtivo = 1
        """
        cursor.execute(count_ativos_query, tuple(params))
        total_ativos = cursor.fetchone()[0]

        # 🔹 Contagem de colaboradores inativos
        count_inativos_query = f"""
            SELECT COUNT(DISTINCT f.NidFuncionario)
            {base_query}
            {where_str}
            {"AND" if where_str else "WHERE"} fe.FlgAtivo = 0
        """
        cursor.execute(count_inativos_query, tuple(params))
        total_inativos = cursor.fetchone()[0]

        # 🔹 Dados paginados
        data_query = f"""
        SELECT
            f.NidFuncionario,
            f.NomFuncionario,
            f.DesCPF,
            s.DesSetor,
            fu.DesFuncao,
            fe.NidEmpresa,
            eh.DesEmpresa,
            fe.FlgAtivo,
            DATE_FORMAT(a.DatASO, '%d/%m/%Y') as DatASO
        {base_query}
        {where_str}
        LIMIT %s OFFSET %s
        """

        data_params = params + [limit, skip]
        df = pd.read_sql_query(data_query, connection, params=data_params)

        # Normalizações
        df['FlgAtivo'] = df['FlgAtivo'].fillna(0).astype(int)
        df['NidEmpresa'] = df['NidEmpresa'].fillna(0).astype(int)
        df['status'] = df['FlgAtivo'].apply(lambda x: 'Ativo' if x == 1 else 'Inativo')

        # Retornar dados com contadores
        return df.to_dict('records'), {
            'total': total_count,
            'total_ativos': total_ativos,
            'total_inativos': total_inativos
        }
    finally:
        connection.close()

def get_employee_exams(nid_funcionario: int, nid_empresa: int):
    connection = get_db_connection()
    params = [nid_funcionario]

    try:
        query = """
        SELECT DISTINCT
            efa.NidAnexo,
            efa.DesAnexo,
            eh.DesEmpresa,
            DATE_FORMAT(t.DatProcedimento, '%d/%m/%Y') AS DatProcedimento 
        FROM smt_master.tfuncionario f
        INNER JOIN smt_master.taso a
            ON a.NidFuncionario = f.NidFuncionario
        INNER JOIN smt_master.tasoexame ae
            ON ae.NidAso = a.NidAso
        INNER JOIN smt_master.texamefuncanexo efa
            ON efa.NidProcedimentoFunc = ae.NidProcedimentoFunc
        INNER JOIN smt_master.tfuncionarioemp fe
            ON fe.NidFuncionario = f.NidFuncionario
        INNER JOIN (
            SELECT NidEmpresa, DesEmpresa
            FROM smt_master.tempresahist
            GROUP BY NidEmpresa, DesEmpresa
        ) eh
            ON eh.NidEmpresa = fe.NidEmpresa
        LEFT JOIN smt_master.tprocedimentofunc t
            ON efa.NidProcedimentoFunc = t.NidProcedimentoFunc
        WHERE f.NidFuncionario = %s
        """

        if nid_empresa:
            query += "AND fe.NidEmpresa = %s"
            params.append(nid_empresa)

        df = pd.read_sql_query(query, connection, params=params)
        
        exams = []
        for _, row in df.iterrows():
            des_anexo = row['DesAnexo']

            # Extract name before the first hyphen, or use full name if no hyphen
            nom_exame = (
                re.sub(r'\s+', ' ', re.split(r"[-_—–]", des_anexo, maxsplit=1)[0]).strip()
                if des_anexo 
                else "Exame"
            )

            exams.append({
                "NidAnexo": row['NidAnexo'],
                "NomExame": nom_exame,
                "DesAnexo": des_anexo,
                "DesEmpresa": row['DesEmpresa'],
                "DatProcedimento": row['DatProcedimento']
            })
        return exams
    finally:
        connection.close()

def get_exam_file_path(nid_anexo: int):
    connection = get_db_connection()
    try:
        cursor = connection.cursor()
        query = "SELECT DesPathAnexo FROM smt_master.texamefuncanexo WHERE NidAnexo = %s"
        cursor.execute(query, (nid_anexo,))
        result = cursor.fetchone()
        if result:
            return result[0]
        return None
    finally:
        connection.close()

def get_companies_with_employee_count(
    skip: int = 0,
    limit: int = 10,
    empresa: str = None,
    status: int = None
):
    connection = get_db_connection()
    try:
        cursor = connection.cursor()

        # Base query to get companies and count active employees
        base_query = """
        SELECT 
            eh.NidEmpresa,
            eh.DesEmpresa,
            eh.DesCNPJCEI,
            eh.GraRisco,
            eh.NidCNAE1,
            eh.FlgSituacao,
            eh.DesEMail,
            eh.DesTelefone1,
            eh.DesTelefone2,
            COUNT(DISTINCT fe.NidFuncionario) as total_funcionarios
        FROM smt_master.tempresahist eh
        LEFT JOIN smt_master.tfuncionarioemp fe
            ON fe.NidEmpresa = eh.NidEmpresa
            AND fe.FlgAtivo = 1
        """

        # Filters
        where_clauses = []
        params = []

        if empresa:
            where_clauses.append("eh.DesEmpresa LIKE %s")
            params.append(f"%{empresa}%")

        if status is not None:
            where_clauses.append("eh.FlgSituacao = %s")
            params.append(status)

        where_str = ""
        if where_clauses:
            where_str = "WHERE " + " AND ".join(where_clauses)

        # Group by to aggregate employee counts
        group_by = """
        GROUP BY eh.NidEmpresa, eh.DesEmpresa, eh.GraRisco, eh.DesCNPJCEI,
                 eh.NidCNAE1, eh.FlgSituacao, eh.DesEMail, eh.DesTelefone1, eh.DesTelefone2
        """

        # Order by company name
        order_by = "ORDER BY eh.DesEmpresa"

        # 1. Count Total Companies
        count_query = f"""
        SELECT COUNT(*) FROM (
            {base_query} {where_str} {group_by}
        ) as subquery
        """
        cursor.execute(count_query, tuple(params))
        total = cursor.fetchone()[0]

        # 2. Get Paginated Companies
        data_query = f"""
        {base_query} {where_str} {group_by} {order_by} LIMIT %s OFFSET %s
        """
        data_params = params + [limit, skip]
        df = pd.read_sql_query(data_query, connection, params=data_params)

        # Convert to list of dicts
        companies = []
        for _, row in df.iterrows():
            companies.append({
                "NidEmpresa": int(row["NidEmpresa"]),
                "DesEmpresa": row["DesEmpresa"],
                "DesCNPJCEI": format_cnpj_cei(row["DesCNPJCEI"]),
                "GraRisco": int(row["GraRisco"]) if pd.notna(row["GraRisco"]) else None,
                "NidCNAE1": int(row["NidCNAE1"]) if pd.notna(row["NidCNAE1"]) else None,
                "FlgSituacao": int(row["FlgSituacao"]) if pd.notna(row["FlgSituacao"]) else None,
                "DesEMail": row["DesEMail"],
                "DesTelefone1": row["DesTelefone1"],
                "DesTelefone2": row["DesTelefone2"],
                "total_funcionarios": int(row["total_funcionarios"]) if pd.notna(row["total_funcionarios"]) else 0
            })

        return companies, {"total": total}
    finally:
        connection.close()

def get_all_employee_exams_grouped(
    skip: int = 0,
    limit: int = 10,
    nid_empresa: int = None,
    nid_funcionario: int = None,
    nome: str = None,
    empresa: str = None,
    cpf: str = None,
    status: int = None
):
    connection = get_db_connection()
    try:
        cursor = connection.cursor()

        base_joins = """
        FROM smt_master.tfuncionario f
        INNER JOIN smt_master.tfuncionarioemp fe
            ON fe.NidFuncionario = f.NidFuncionario
        INNER JOIN (
            SELECT NidEmpresa, DesEmpresa
            FROM smt_master.tempresahist
            GROUP BY NidEmpresa, DesEmpresa
        ) eh
            ON eh.NidEmpresa = fe.NidEmpresa
        INNER JOIN smt_master.taso a
            ON a.NidFuncionario = f.NidFuncionario
            AND a.NidEmpresa = fe.NidEmpresa
        INNER JOIN smt_master.tasoexame ae
            ON ae.NidAso = a.NidAso
        INNER JOIN smt_master.texamefuncanexo efa
            ON efa.NidProcedimentoFunc = ae.NidProcedimentoFunc
        """

        where_clauses = []
        params = []

        if nid_empresa:
            where_clauses.append("fe.NidEmpresa = %s")
            params.append(nid_empresa)

        if nid_funcionario:
            where_clauses.append("f.NidFuncionario = %s")
            params.append(nid_funcionario)

        if nome:
            where_clauses.append("f.NomFuncionario LIKE %s")
            params.append(f"%{nome}%")

        if empresa:
            where_clauses.append("eh.DesEmpresa LIKE %s")
            params.append(f"%{empresa}%")

        if cpf:
            where_clauses.append("f.DesCPF LIKE %s")
            params.append(f"%{cpf}%")

        if status is not None:
            where_clauses.append("fe.FlgAtivo = %s")
            params.append(status)

        where_str = ""
        if where_clauses:
            where_str = "WHERE " + " AND ".join(where_clauses)

        # 1. Count Total Distinct Employees
        count_query = f"SELECT COUNT(DISTINCT f.NidFuncionario) {base_joins} {where_str}"
        cursor.execute(count_query, tuple(params))
        total = cursor.fetchone()[0]

        # 2. Get Page IDs
        ids_query = f"""
        SELECT DISTINCT f.NidFuncionario 
        {base_joins} 
        {where_str} 
        ORDER BY f.NidFuncionario 
        LIMIT %s OFFSET %s
        """
        cursor.execute(ids_query, tuple(params + [limit, skip]))
        rows = cursor.fetchall()
        page_ids = [row[0] for row in rows]

        if not page_ids:
            return [], {"total": total}

        # 3. Fetch Data for Page IDs
        placeholders = ','.join(['%s'] * len(page_ids))
        
        data_query = f"""
        SELECT
            f.NidFuncionario,
            f.NomFuncionario,
            f.DesCPF,
            fe.NidEmpresa,
            eh.DesEmpresa,
            efa.NidAnexo,
            efa.DesAnexo,
            DATE_FORMAT(a.DatASO, '%d/%m/%Y') AS DatASO,
            DATE_FORMAT(a.DatValidade, '%d/%m/%Y') AS DatValidade
        {base_joins}
        WHERE f.NidFuncionario IN ({placeholders})
        """

        data_params = list(page_ids)
        if nid_empresa:
            data_query += " AND fe.NidEmpresa = %s"
            data_params.append(nid_empresa)

        data_query += " ORDER BY f.NidFuncionario, a.DatASO DESC"

        df = pd.read_sql_query(data_query, connection, params=data_params)

        employees = {}

        for _, row in df.iterrows():
            nid_func = int(row["NidFuncionario"])

            if nid_func not in employees:
                employees[nid_func] = {
                    "NidFuncionario": nid_func,
                    "NomFuncionario": row["NomFuncionario"],
                    "DesCPF": row["DesCPF"],
                    "NidEmpresa": int(row["NidEmpresa"]),
                    "DesEmpresa": row["DesEmpresa"],
                    "exames": []
                }

            employees[nid_func]["exames"].append({
                "NidAnexo": int(row["NidAnexo"]),
                "NomExame": (
                    re.sub(r'\s+', ' ', re.split(r"[-_—–]", row["DesAnexo"], maxsplit=1)[0]).strip()
                    if row["DesAnexo"] 
                    else "Exame"
                ),
                "DesAnexo": row["DesAnexo"],
                "DatASO": row["DatASO"],
                "DatValidade": row["DatValidade"]
            })

        return list(employees.values()), {"total": total}
    finally:
        connection.close()

# ================= VALIDAÇÃO DE LOGIN ==================

def get_master_login_by_login(login: str) -> Optional[Dict[str, Any]]:
    connection = get_db_connection()
    try:
        cursor = connection.cursor(dictionary=True)
        query = """
            SELECT
                NidLogin AS id,
                DesLogin AS login,
                DesSenhaHash AS senha_hash,
                DesRole AS role
            FROM smt_master.tauthsitemaster
            WHERE DesLogin = %s
              AND DesRole = 'master'
            LIMIT 1
        """
        cursor.execute(query, (login,))
        return cursor.fetchone()
    finally:
        connection.close()

def get_company_login_by_login(login: str) -> Optional[Dict[str, Any]]:
    connection = get_db_connection()
    try:
        cursor = connection.cursor(dictionary=True)
        query = """
            SELECT
                NidLogin AS id,
                DesLogin AS login,
                DesSenhaHash AS senha_hash,
                DesRole AS role,
                NidEmpresa AS company_id
            FROM smt_master.tauthsitemaster
            WHERE DesLogin = %s
              AND DesRole = 'convenio'
            LIMIT 1
        """
        cursor.execute(query, (login,))
        return cursor.fetchone()
    finally:
        connection.close()

def get_employee_login_by_login(login: str) -> Optional[Dict[str, Any]]:
    connection = get_db_connection()
    try:
        cursor = connection.cursor(dictionary=True)
        query = """
            SELECT
                NidLogin AS id,
                DesLogin AS login,
                DesSenhaHash AS senha_hash,
                DesRole AS role,
                NidFuncionario AS employee_id,
                NidEmpresa AS company_id
            FROM smt_master.tauthsitemaster
            WHERE DesLogin = %s
              AND DesRole = 'cliente'
            LIMIT 1
        """
        cursor.execute(query, (login,))
        return cursor.fetchone()
    finally:
        connection.close()

def get_auth_by_id(nid_auth: int) -> Optional[Dict[str, Any]]:
    connection = get_db_connection()
    try:
        cursor = connection.cursor(dictionary=True)
        query = """
            SELECT
                NidLogin AS id,
                DesLogin AS login,
                DesRole AS role,
                NidEmpresa AS company_id,
                NidFuncionario AS employee_id
            FROM smt_master.tauthsitemaster
            WHERE NidLogin = %s
            LIMIT 1
        """
        cursor.execute(query, (nid_auth,))
        return cursor.fetchone()
    finally:
        connection.close()

# =============== CADASTRO DE NOVOS LOGINS ===============

def login_exists_anywhere(login: str) -> bool:
    """
    Como agora é tabela única, basta checar nela.
    Se você quiser permitir o MESMO login em roles diferentes, troque por:
    WHERE DesLogin=%s AND DesRole=%s
    """
    connection = get_db_connection()
    try:
        cursor = connection.cursor()
        query = "SELECT 1 FROM smt_master.tauthsitemaster WHERE DesLogin = %s LIMIT 1"
        cursor.execute(query, (login,))
        return cursor.fetchone() is not None
    finally:
        connection.close()

def create_master_login(login: str, senha_hash: str) -> int:
    connection = get_db_connection()
    try:
        cursor = connection.cursor()

        if login_exists_anywhere(login):
            raise ValueError("Login já está em uso")

        query = """
            INSERT INTO smt_master.tauthsitemaster
                (DesLogin, DesSenhaHash, DesRole, NidEmpresa, NidFuncionario)
            VALUES
                (%s, %s, 'master', NULL, NULL)
        """
        cursor.execute(query, (login, senha_hash))
        connection.commit()
        return cursor.lastrowid
    except mysql.connector.Error:
        connection.rollback()
        raise
    finally:
        connection.close()

def create_company_login(login: str, senha_hash: str, nid_empresa: int, access_level: int) -> int:
    connection = get_db_connection()
    try:
        cursor = connection.cursor()

        if login_exists_anywhere(login):
            raise ValueError("Login já está em uso")

        # valida empresa existe
        check_empresa = """
            SELECT 1
            FROM smt_master.tempresahist
            WHERE NidEmpresa = %s
            LIMIT 1
        """
        cursor.execute(check_empresa, (nid_empresa,))
        if not cursor.fetchone():
            raise ValueError("Empresa não encontrada")

        query = """
            INSERT INTO smt_master.tauthsitemaster
                (DesLogin, DesSenhaHash, DesRole, NidEmpresa, NidFuncionario, AccessLevel)
            VALUES
                (%s, %s, 'convenio', %s, NULL, %s)
        """
        cursor.execute(query, (login, senha_hash, nid_empresa, access_level))
        connection.commit()
        return cursor.lastrowid
    except mysql.connector.Error:
        connection.rollback()
        raise
    finally:
        connection.close()

def create_employee_login(
    login: str,
    senha_hash: str,
    nid_funcionario: int,
    nid_empresa: int
) -> int:
    connection = get_db_connection()
    try:
        cursor = connection.cursor()

        if login_exists_anywhere(login):
            raise ValueError("Login já está em uso")

        # Valida funcionário existe
        check_func = """
            SELECT 1
            FROM smt_master.tfuncionario
            WHERE NidFuncionario = %s
            LIMIT 1
        """
        cursor.execute(check_func, (nid_funcionario,))
        if not cursor.fetchone():
            raise ValueError("Funcionário não encontrado")

        # Valida vínculo funcionário x empresa
        check_vinculo = """
            SELECT 1
            FROM smt_master.tfuncionarioemp
            WHERE NidFuncionario = %s AND NidEmpresa = %s
            LIMIT 1
        """
        cursor.execute(check_vinculo, (nid_funcionario, nid_empresa))
        if not cursor.fetchone():
            raise ValueError("Funcionário não vinculado à empresa informada")

        query = """
            INSERT INTO smt_master.tauthsitemaster
                (DesLogin, DesSenhaHash, DesRole, NidEmpresa, NidFuncionario)
            VALUES
                (%s, %s, 'cliente', %s, %s)
        """
        cursor.execute(query, (login, senha_hash, nid_empresa, nid_funcionario))
        connection.commit()
        return cursor.lastrowid
    except mysql.connector.Error:
        connection.rollback()
        raise
    finally:
        connection.close()
