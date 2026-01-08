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
        SELECT f.NidFuncionario, f.NomFuncionario, f.DesCPF, s.DesSetor, fu.DesFuncao
        FROM smt_master.tfuncionario f
        INNER JOIN smt_master.tfuncionarioemp fe ON f.NidFuncionario = fe.NidFuncionario
        LEFT JOIN smt_master.tsetor s ON fe.NidSetor = s.NidSetor
        LEFT JOIN smt_master.tfuncao fu ON fe.NidFuncao = fu.NidFuncao
        WHERE fe.NidEmpresa = %s AND fe.FlgAtivo = 1
        """
        df = pd.read_sql_query(query, connection, params=[nid_empresa])
        return df.to_dict('records')
    finally:
        connection.close()
