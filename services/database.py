import mariadb
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
    port = int(os.getenv('DB_PORT'))

    try:
        connection = mariadb.connect(
            host=host,
            user=user,
            password=password,
            database=database,
            port=port
        )
        return connection
    except mariadb.Error as e:
        raise Exception(f"Database connection error: {e}")

def get_employees_by_company(nid_empresa: int):
    connection = get_db_connection()
    try:
        query = """
        SELECT f.NidFuncionario, f.NomFuncionario, f.DesCPF, s.DesSetor, fu.DesFuncao, fe.NidEmpresa, fe.FlgAtivo
        FROM smt_master.tfuncionario f
        INNER JOIN smt_master.tfuncionarioemp fe ON f.NidFuncionario = fe.NidFuncionario
        LEFT JOIN smt_master.tsetor s ON fe.NidSetor = s.NidSetor
        LEFT JOIN smt_master.tfuncao fu ON fe.NidFuncao = fu.NidFuncao
        WHERE fe.NidEmpresa = %s AND fe.FlgAtivo = 1
        """
        df = pd.read_sql_query(query, connection, params=[nid_empresa])
        df['status'] = df['FlgAtivo'].apply(lambda x: 'Ativo' if x == 10 else 'Inativo')
        return df.to_dict('records')
    finally:
        connection.close()

def get_all_employees(skip: int = 0, limit: int = 10, nome: str = None, cpf: str = None, status: int = None):
    connection = get_db_connection()
    try:
        cursor = connection.cursor()
        
        # Base da query (joins)
        base_query = """
        FROM smt_master.tfuncionario f
        INNER JOIN smt_master.tfuncionarioemp fe ON f.NidFuncionario = fe.NidFuncionario
        LEFT JOIN smt_master.tsetor s ON fe.NidSetor = s.NidSetor
        LEFT JOIN smt_master.tfuncao fu ON fe.NidFuncao = fu.NidFuncao
        """
        
        # Construção dinâmica dos filtros
        where_clauses = []
        params = []
        
        if nome:
            where_clauses.append("f.NomFuncionario LIKE %s")
            params.append(f"%{nome}%")
        
        if cpf:
            where_clauses.append("f.DesCPF LIKE %s")
            params.append(f"%{cpf}%")
            
        if status is not None:
            where_clauses.append("fe.FlgAtivo = %s")
            params.append(status)
            
        where_str = ""
        if where_clauses:
            where_str = "WHERE " + " AND ".join(where_clauses)

        # 1. Query para contar o total (aplicando os mesmos filtros)
        count_query = f"SELECT COUNT(*) {base_query} {where_str}"
        cursor.execute(count_query, tuple(params))
        total_count = cursor.fetchone()[0]

        # 2. Query para buscar os dados paginados
        data_query = f"""
        SELECT f.NidFuncionario, f.NomFuncionario, f.DesCPF, s.DesSetor, fu.DesFuncao, fe.NidEmpresa, fe.FlgAtivo
        {base_query}
        {where_str}
        LIMIT %s OFFSET %s
        """
        # Adiciona limit e skip aos parâmetros para a query de dados
        data_params = params + [limit, skip]
        
        df = pd.read_sql_query(data_query, connection, params=data_params)
        
        df['FlgAtivo'] = df['FlgAtivo'].fillna(0).astype(int)
        df['NidEmpresa'] = df['NidEmpresa'].fillna(0).astype(int)
        df['status'] = df['FlgAtivo'].apply(lambda x: 'Ativo' if x == 10 else 'Inativo')
        return df.to_dict('records'), total_count
    finally:
        connection.close()

def get_full_employee_list():
    connection = get_db_connection()
    try:
        query = """
        SELECT f.NidFuncionario, f.NomFuncionario, f.DesCPF, s.DesSetor, fu.DesFuncao, fe.NidEmpresa, fe.FlgAtivo
        FROM smt_master.tfuncionario f
        INNER JOIN smt_master.tfuncionarioemp fe ON f.NidFuncionario = fe.NidFuncionario
        LEFT JOIN smt_master.tsetor s ON fe.NidSetor = s.NidSetor
        LEFT JOIN smt_master.tfuncao fu ON fe.NidFuncao = fu.NidFuncao
        """
        df = pd.read_sql_query(query, connection)
        
        df['FlgAtivo'] = df['FlgAtivo'].fillna(0).astype(int)
        df['NidEmpresa'] = df['NidEmpresa'].fillna(0).astype(int)
        df['status'] = df['FlgAtivo'].apply(lambda x: 'Ativo' if x == 10 else 'Inativo')
        return df.to_dict('records')
    finally:
        connection.close()

def get_employee_exams(nid_funcionario: int):
    connection = get_db_connection()
    try:
        query = """
        SELECT efa.NidAnexo, efa.DesAnexo
        FROM smt_master.tfuncionario f
        INNER JOIN smt_master.taso a ON f.NidFuncionario = a.NidFuncionario
        INNER JOIN smt_master.tasoexame ae ON a.NidAso = ae.NidAso
        INNER JOIN smt_master.texamefuncanexo efa ON ae.NidProcedimentoFunc = efa.NidProcedimentoFunc
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
