import mysql.connector
import pandas as pd
from dotenv import load_dotenv
import os

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
        df['status'] = df['FlgAtivo'].apply(lambda x: 'Ativo' if x == 1 else 'Inativo')
        return df.to_dict('records')
    finally:
        connection.close()

def get_all_employees(
    skip: int = 0,
    limit: int = 10,
    nome: str = None,
    empresa: str = None,
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
        """

        # Filtros dinâmicos
        where_clauses = []
        params = []

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
            fe.FlgAtivo
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



def get_employee_exams(nid_funcionario: int):
    connection = get_db_connection()
    try:
        query = """
        SELECT efa.NidAnexo, efa.DesAnexo
        FROM smt_master.tfuncionario f
        INNER JOIN smt_master.taso a
            ON a.NidFuncionario = f.NidFuncionario
        INNER JOIN smt_master.tasoexame ae
            ON ae.NidAso = a.NidAso
        INNER JOIN smt_master.texamefuncanexo efa
            ON efa.NidProcedimentoFunc = ae.NidProcedimentoFunc
        WHERE f.NidFuncionario = %s
        """
        df = pd.read_sql_query(query, connection, params=[nid_funcionario])
        
        exams = []
        for _, row in df.iterrows():
            des_anexo = row['DesAnexo']
            # Extract name before the first hyphen, or use full name if no hyphen
            nom_exame = des_anexo.split('-')[0].strip() if des_anexo and '-' in des_anexo else (des_anexo or "Exame")
            
            exams.append({
                "NidAnexo": row['NidAnexo'],
                "NomExame": nom_exame,
                "DesAnexo": des_anexo
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
