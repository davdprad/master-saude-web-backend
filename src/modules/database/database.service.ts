import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createPool, Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { formatCnpjCei } from '../../utils/cnpj-formatter';

type AuthLoginRow = {
  id: number;
  login: string;
  senha_hash: string;
  role: string;
  company_id?: number | null;
  employee_id?: number | null;
  AccessLevel?: number | null;
};

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor() {
    this.pool = createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      port: Number(process.env.DB_PORT ?? 3306),
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: false,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  private normalizeExamName(desAnexo: string | null): string {
    if (!desAnexo) {
      return 'Exame';
    }

    if (desAnexo.toLowerCase().includes('raio')) {
      return desAnexo.split('-').slice(0, -1).join('-').replace(/\s+/g, ' ').trim() || desAnexo;
    }

    return desAnexo.split(/[-_—–]/)[0].replace(/\s+/g, ' ').trim();
  }

  async getEmployeesByCompany(nidEmpresa: number): Promise<{ employees: Record<string, unknown>[]; counters: Record<string, number> }> {
    const query = `
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
      WHERE fe.NidEmpresa = ?
    `;

    const [rows] = await this.pool.query<RowDataPacket[]>(query, [nidEmpresa]);

    const employees = rows.map((row) => {
      const flag = Number(row.FlgAtivo ?? 0);
      return {
        ...row,
        FlgAtivo: flag,
        status: flag === 1 ? 'Ativo' : 'Inativo',
      };
    });

    return {
      employees,
      counters: {
        total: employees.length,
        total_ativos: employees.filter((employee) => Number(employee.FlgAtivo) === 1).length,
        total_inativos: employees.filter((employee) => Number(employee.FlgAtivo) === 0).length,
      },
    };
  }

  async getAllEmployees(params: {
    skip: number;
    limit: number;
    nome?: string;
    nidFuncionario?: number;
    empresa?: string;
    nidEmpresa?: number;
    cpf?: string;
    status?: number;
  }): Promise<{ employees: Record<string, unknown>[]; counters: Record<string, number> }> {
    const baseQuery = `
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
    `;

    const whereClauses: string[] = [];
    const whereParams: unknown[] = [];

    if (params.nome) {
      whereClauses.push('f.NomFuncionario LIKE ?');
      whereParams.push(`%${params.nome}%`);
    }
    if (params.nidFuncionario) {
      whereClauses.push('f.NidFuncionario LIKE ?');
      whereParams.push(String(params.nidFuncionario));
    }
    if (params.empresa) {
      whereClauses.push('eh.DesEmpresa LIKE ?');
      whereParams.push(`%${params.empresa}%`);
    }
    if (params.nidEmpresa) {
      whereClauses.push('fe.NidEmpresa LIKE ?');
      whereParams.push(String(params.nidEmpresa));
    }
    if (params.cpf) {
      whereClauses.push('f.DesCPF LIKE ?');
      whereParams.push(`%${params.cpf}%`);
    }
    if (params.status !== undefined) {
      whereClauses.push('fe.FlgAtivo = ?');
      whereParams.push(params.status);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const andOrWhere = whereSql ? 'AND' : 'WHERE';

    const [totalRows] = await this.pool.query<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT f.NidFuncionario) AS total ${baseQuery} ${whereSql}`,
      whereParams,
    );
    const [ativosRows] = await this.pool.query<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT f.NidFuncionario) AS total ${baseQuery} ${whereSql} ${andOrWhere} fe.FlgAtivo = 1`,
      whereParams,
    );
    const [inativosRows] = await this.pool.query<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT f.NidFuncionario) AS total ${baseQuery} ${whereSql} ${andOrWhere} fe.FlgAtivo = 0`,
      whereParams,
    );

    const dataQuery = `
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
      ${baseQuery}
      ${whereSql}
      LIMIT ? OFFSET ?
    `;
    const [dataRows] = await this.pool.query<RowDataPacket[]>(dataQuery, [...whereParams, params.limit, params.skip]);

    const employees = dataRows.map((row) => {
      const flag = Number(row.FlgAtivo ?? 0);
      return {
        ...row,
        FlgAtivo: flag,
        NidEmpresa: Number(row.NidEmpresa ?? 0),
        status: flag === 1 ? 'Ativo' : 'Inativo',
      };
    });

    return {
      employees,
      counters: {
        total: Number(totalRows[0]?.total ?? 0),
        total_ativos: Number(ativosRows[0]?.total ?? 0),
        total_inativos: Number(inativosRows[0]?.total ?? 0),
      },
    };
  }

  async getEmployeeExams(
    nidFuncionario: number,
    nidEmpresa?: number,
    onlyAso = false,
  ): Promise<Record<string, unknown>[]> {
    const sqlParts = [
      `
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
      WHERE f.NidFuncionario = ?
      `,
    ];

    const params: unknown[] = [nidFuncionario];

    if (nidEmpresa) {
      sqlParts.push('AND fe.NidEmpresa = ?');
      params.push(nidEmpresa);
    }
    if (onlyAso) {
      sqlParts.push("AND efa.DesAnexo LIKE '%aso%'");
    }

    const [rows] = await this.pool.query<RowDataPacket[]>(sqlParts.join('\n'), params);

    return rows.map((row) => ({
      NidAnexo: row.NidAnexo,
      NomExame: this.normalizeExamName(row.DesAnexo),
      DesAnexo: row.DesAnexo,
      DesEmpresa: row.DesEmpresa,
      DatProcedimento: row.DatProcedimento,
    }));
  }

  async getExamFilePath(nidAnexo: number, onlyAso = false): Promise<string | null> {
    let query = 'SELECT DesPathAnexo FROM smt_master.texamefuncanexo WHERE NidAnexo = ?';
    if (onlyAso) {
      query += " AND DesAnexo LIKE '%aso%'";
    }

    const [rows] = await this.pool.query<RowDataPacket[]>(query, [nidAnexo]);
    return rows[0]?.DesPathAnexo ?? null;
  }

  async getExamOwnershipByAnexo(
    nidAnexo: number,
    onlyAso = false,
  ): Promise<{ path: string; nidFuncionario: number; nidEmpresa: number } | null> {
    let query = `
      SELECT
          efa.DesPathAnexo AS path,
          a.NidFuncionario AS nidFuncionario,
          a.NidEmpresa AS nidEmpresa
      FROM smt_master.texamefuncanexo efa
      INNER JOIN smt_master.tasoexame ae
          ON ae.NidProcedimentoFunc = efa.NidProcedimentoFunc
      INNER JOIN smt_master.taso a
          ON a.NidAso = ae.NidAso
      WHERE efa.NidAnexo = ?
      LIMIT 1
    `;

    if (onlyAso) {
      query = query.replace('LIMIT 1', "AND efa.DesAnexo LIKE '%aso%' LIMIT 1");
    }

    const [rows] = await this.pool.query<RowDataPacket[]>(query, [nidAnexo]);
    if (!rows[0]) {
      return null;
    }

    return {
      path: String(rows[0].path),
      nidFuncionario: Number(rows[0].nidFuncionario),
      nidEmpresa: Number(rows[0].nidEmpresa),
    };
  }

  async getCompaniesWithEmployeeCount(params: {
    skip: number;
    limit: number;
    empresa?: string;
    status?: number;
  }): Promise<{ companies: Record<string, unknown>[]; counters: Record<string, number> }> {
    const baseFrom = `
      FROM (
        SELECT
          NidEmpresa,
          MAX(DesEmpresa) AS DesEmpresa,
          MAX(DesCNPJCEI) AS DesCNPJCEI,
          MAX(GraRisco) AS GraRisco,
          MAX(NidCNAE1) AS NidCNAE1,
          MAX(FlgSituacao) AS FlgSituacao,
          MAX(DesEMail) AS DesEMail,
          MAX(DesTelefone1) AS DesTelefone1,
          MAX(DesTelefone2) AS DesTelefone2
        FROM smt_master.tempresahist
        GROUP BY NidEmpresa
      ) eh
      LEFT JOIN (
        SELECT
          NidEmpresa,
          COUNT(DISTINCT NidFuncionario) AS total_funcionarios
        FROM smt_master.tfuncionarioemp
        WHERE FlgAtivo = 1
        GROUP BY NidEmpresa
      ) fe
        ON fe.NidEmpresa = eh.NidEmpresa
    `;

    const whereClauses: string[] = [];
    const queryParams: unknown[] = [];

    if (params.empresa) {
      whereClauses.push('eh.DesEmpresa LIKE ?');
      queryParams.push(`%${params.empresa}%`);
    }
    if (params.status !== undefined) {
      whereClauses.push('eh.FlgSituacao = ?');
      queryParams.push(params.status);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [totalRows] = await this.pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total ${baseFrom} ${whereSql}`,
      queryParams,
    );

    const ativosClauses = [...whereClauses, 'eh.FlgSituacao = 1'];
    const ativosWhere = `WHERE ${ativosClauses.join(' AND ')}`;
    const [ativosRows] = await this.pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total ${baseFrom} ${ativosWhere}`,
      queryParams,
    );

    const inativosClauses = [...whereClauses, 'eh.FlgSituacao = 0'];
    const inativosWhere = `WHERE ${inativosClauses.join(' AND ')}`;
    const [inativosRows] = await this.pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total ${baseFrom} ${inativosWhere}`,
      queryParams,
    );

    const [companyRows] = await this.pool.query<RowDataPacket[]>(
      `
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
          COALESCE(fe.total_funcionarios, 0) AS total_funcionarios
      ${baseFrom}
      ${whereSql}
      ORDER BY eh.DesEmpresa
      LIMIT ? OFFSET ?
      `,
      [...queryParams, params.limit, params.skip],
    );

    const companies = companyRows.map((row) => ({
      NidEmpresa: Number(row.NidEmpresa),
      DesEmpresa: row.DesEmpresa,
      DesCNPJCEI: formatCnpjCei(String(row.DesCNPJCEI ?? '')),
      GraRisco: row.GraRisco !== null ? Number(row.GraRisco) : null,
      NidCNAE1: row.NidCNAE1 !== null ? Number(row.NidCNAE1) : null,
      FlgSituacao: row.FlgSituacao !== null ? Number(row.FlgSituacao) : null,
      DesEMail: row.DesEMail,
      DesTelefone1: row.DesTelefone1,
      DesTelefone2: row.DesTelefone2,
      total_funcionarios: row.total_funcionarios !== null ? Number(row.total_funcionarios) : 0,
    }));

    return {
      companies,
      counters: {
        total: Number(totalRows[0]?.total ?? 0),
        total_ativas: Number(ativosRows[0]?.total ?? 0),
        total_inativas: Number(inativosRows[0]?.total ?? 0),
      },
    };
  }

  async getAllEmployeeExamsGrouped(params: {
    skip: number;
    limit: number;
    nidEmpresa?: number;
    nidFuncionario?: number;
    nome?: string;
    empresa?: string;
    cpf?: string;
    status?: number;
    onlyAso?: boolean;
  }): Promise<{ employees: Record<string, unknown>[]; total: number }> {
    const baseJoins = `
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
    `;

    const whereClauses: string[] = [];
    const whereParams: unknown[] = [];

    if (params.nidEmpresa) {
      whereClauses.push('fe.NidEmpresa = ?');
      whereParams.push(params.nidEmpresa);
    }
    if (params.nidFuncionario) {
      whereClauses.push('f.NidFuncionario = ?');
      whereParams.push(params.nidFuncionario);
    }
    if (params.nome) {
      whereClauses.push('f.NomFuncionario LIKE ?');
      whereParams.push(`%${params.nome}%`);
    }
    if (params.empresa) {
      whereClauses.push('eh.DesEmpresa LIKE ?');
      whereParams.push(`%${params.empresa}%`);
    }
    if (params.cpf) {
      whereClauses.push('f.DesCPF LIKE ?');
      whereParams.push(`%${params.cpf}%`);
    }
    if (params.status !== undefined) {
      whereClauses.push('fe.FlgAtivo = ?');
      whereParams.push(params.status);
    }
    if (params.onlyAso) {
      whereClauses.push("efa.DesAnexo LIKE '%aso%'");
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [countRows] = await this.pool.query<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT f.NidFuncionario) AS total ${baseJoins} ${whereSql}`,
      whereParams,
    );
    const total = Number(countRows[0]?.total ?? 0);

    const [idRows] = await this.pool.query<RowDataPacket[]>(
      `
      SELECT DISTINCT f.NidFuncionario
      ${baseJoins}
      ${whereSql}
      ORDER BY f.NidFuncionario
      LIMIT ? OFFSET ?
      `,
      [...whereParams, params.limit, params.skip],
    );

    const pageIds = idRows.map((row) => Number(row.NidFuncionario));
    if (pageIds.length === 0) {
      return { employees: [], total };
    }

    const placeholders = pageIds.map(() => '?').join(',');
    const dataParams: unknown[] = [...pageIds];

    let dataQuery = `
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
      ${baseJoins}
      WHERE f.NidFuncionario IN (${placeholders})
    `;

    if (params.nidEmpresa) {
      dataQuery += ' AND fe.NidEmpresa = ?';
      dataParams.push(params.nidEmpresa);
    }

    dataQuery += ' ORDER BY f.NidFuncionario, a.DatASO DESC';

    const [rows] = await this.pool.query<RowDataPacket[]>(dataQuery, dataParams);

    const employeesMap = new Map<number, Record<string, unknown>>();

    for (const row of rows) {
      const nidFuncionario = Number(row.NidFuncionario);

      if (!employeesMap.has(nidFuncionario)) {
        employeesMap.set(nidFuncionario, {
          NidFuncionario: nidFuncionario,
          NomFuncionario: row.NomFuncionario,
          DesCPF: row.DesCPF,
          NidEmpresa: Number(row.NidEmpresa),
          DesEmpresa: row.DesEmpresa,
          exames: [],
        });
      }

      const employee = employeesMap.get(nidFuncionario);
      if (!employee) {
        continue;
      }

      (employee.exames as Record<string, unknown>[]).push({
        NidAnexo: Number(row.NidAnexo),
        NomExame: this.normalizeExamName(row.DesAnexo),
        DesAnexo: row.DesAnexo,
        DatASO: row.DatASO,
        DatValidade: row.DatValidade,
      });
    }

    return {
      employees: Array.from(employeesMap.values()),
      total,
    };
  }

  async getMasterLoginByLogin(login: string): Promise<AuthLoginRow | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `
      SELECT
          NidLogin AS id,
          DesLogin AS login,
          DesSenhaHash AS senha_hash,
          DesRole AS role
      FROM smt_master.tauthsitemaster
      WHERE DesLogin = ?
        AND DesRole = 'master'
      LIMIT 1
      `,
      [login],
    );
    return (rows[0] as AuthLoginRow) ?? null;
  }

  async getCompanyLoginByLogin(login: string): Promise<AuthLoginRow | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `
      SELECT
          NidLogin AS id,
          DesLogin AS login,
          DesSenhaHash AS senha_hash,
          DesRole AS role,
          NidEmpresa AS company_id,
          AccessLevel
      FROM smt_master.tauthsitemaster
      WHERE DesLogin = ?
        AND DesRole = 'convenio'
      LIMIT 1
      `,
      [login],
    );
    return (rows[0] as AuthLoginRow) ?? null;
  }

  async getEmployeeLoginByLogin(login: string): Promise<AuthLoginRow | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `
      SELECT
          NidLogin AS id,
          DesLogin AS login,
          DesSenhaHash AS senha_hash,
          DesRole AS role,
          NidFuncionario AS employee_id,
          NidEmpresa AS company_id
      FROM smt_master.tauthsitemaster
      WHERE DesLogin = ?
        AND DesRole = 'cliente'
      LIMIT 1
      `,
      [login],
    );
    return (rows[0] as AuthLoginRow) ?? null;
  }

  async getRegisteredLogins(params: {
    skip: number;
    limit: number;
    login?: string;
    role?: string;
  }): Promise<{ users: Record<string, unknown>[]; total: number }> {
    const whereClauses: string[] = [];
    const whereParams: unknown[] = [];

    if (params.login) {
      whereClauses.push('a.DesLogin LIKE ?');
      whereParams.push(`%${params.login}%`);
    }
    if (params.role) {
      whereClauses.push('a.DesRole = ?');
      whereParams.push(params.role);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [countRows] = await this.pool.query<RowDataPacket[]>(
      `
      SELECT COUNT(*) AS total
      FROM smt_master.tauthsitemaster a
      ${whereSql}
      `,
      whereParams,
    );

    const [rows] = await this.pool.query<RowDataPacket[]>(
      `
      SELECT
          a.NidLogin AS id,
          a.DesLogin AS login,
          a.DesRole AS role,
          a.NidEmpresa AS company_id,
          a.NidFuncionario AS employee_id,
          a.AccessLevel AS access_level
      FROM smt_master.tauthsitemaster a
      ${whereSql}
      ORDER BY a.NidLogin DESC
      LIMIT ? OFFSET ?
      `,
      [...whereParams, params.limit, params.skip],
    );

    const users = rows.map((row) => ({
      id: Number(row.id),
      login: row.login,
      role: row.role,
      company_id: row.company_id !== null ? Number(row.company_id) : null,
      employee_id: row.employee_id !== null ? Number(row.employee_id) : null,
      access_level: row.access_level !== null ? Number(row.access_level) : null,
    }));

    return {
      users,
      total: Number(countRows[0]?.total ?? 0),
    };
  }

  async deleteRegisteredLogin(userId: number): Promise<void> {
    const [existingRows] = await this.pool.query<RowDataPacket[]>(
      `
      SELECT 1
      FROM smt_master.tauthsitemaster
      WHERE NidLogin = ?
      LIMIT 1
      `,
      [userId],
    );

    if (!existingRows[0]) {
      throw new Error('Usuário não encontrado');
    }

    await this.pool.query<ResultSetHeader>(
      `
      DELETE FROM smt_master.tauthsitemaster
      WHERE NidLogin = ?
      `,
      [userId],
    );
  }

  async loginExistsAnywhere(login: string): Promise<boolean> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      'SELECT 1 FROM smt_master.tauthsitemaster WHERE DesLogin = ? LIMIT 1',
      [login],
    );
    return Boolean(rows[0]);
  }

  async createMasterLogin(login: string, senhaHash: string): Promise<number> {
    if (await this.loginExistsAnywhere(login)) {
      throw new Error('Login já está em uso');
    }

    const [result] = await this.pool.query<ResultSetHeader>(
      `
      INSERT INTO smt_master.tauthsitemaster
          (DesLogin, DesSenhaHash, DesRole, NidEmpresa, NidFuncionario)
      VALUES
          (?, ?, 'master', NULL, NULL)
      `,
      [login, senhaHash],
    );
    return Number(result.insertId);
  }

  async createCompanyLogin(login: string, senhaHash: string, nidEmpresa: number, accessLevel: number): Promise<number> {
    if (await this.loginExistsAnywhere(login)) {
      throw new Error('Login já está em uso');
    }

    const [companyRows] = await this.pool.query<RowDataPacket[]>(
      `
      SELECT 1
      FROM smt_master.tempresahist
      WHERE NidEmpresa = ?
      LIMIT 1
      `,
      [nidEmpresa],
    );

    if (!companyRows[0]) {
      throw new Error('Empresa não encontrada');
    }

    const [result] = await this.pool.query<ResultSetHeader>(
      `
      INSERT INTO smt_master.tauthsitemaster
          (DesLogin, DesSenhaHash, DesRole, NidEmpresa, NidFuncionario, AccessLevel)
      VALUES
          (?, ?, 'convenio', ?, NULL, ?)
      `,
      [login, senhaHash, nidEmpresa, accessLevel],
    );

    return Number(result.insertId);
  }

  async createEmployeeLogin(login: string, senhaHash: string, nidFuncionario: number, nidEmpresa: number): Promise<number> {
    if (await this.loginExistsAnywhere(login)) {
      throw new Error('Login já está em uso');
    }

    const [employeeRows] = await this.pool.query<RowDataPacket[]>(
      `
      SELECT 1
      FROM smt_master.tfuncionario
      WHERE NidFuncionario = ?
      LIMIT 1
      `,
      [nidFuncionario],
    );

    if (!employeeRows[0]) {
      throw new Error('Funcionário não encontrado');
    }

    const [relationshipRows] = await this.pool.query<RowDataPacket[]>(
      `
      SELECT 1
      FROM smt_master.tfuncionarioemp
      WHERE NidFuncionario = ? AND NidEmpresa = ?
      LIMIT 1
      `,
      [nidFuncionario, nidEmpresa],
    );

    if (!relationshipRows[0]) {
      throw new Error('Funcionário não vinculado à empresa informada');
    }

    const [result] = await this.pool.query<ResultSetHeader>(
      `
      INSERT INTO smt_master.tauthsitemaster
          (DesLogin, DesSenhaHash, DesRole, NidEmpresa, NidFuncionario)
      VALUES
          (?, ?, 'cliente', ?, ?)
      `,
      [login, senhaHash, nidEmpresa, nidFuncionario],
    );

    return Number(result.insertId);
  }

  async addPatientToQueue(params: {
    nid_empresa: number;
    nome_paciente: string;
    tipo_fila: string;
    cpf?: string;
    rg?: string;
    data_nascimento?: string;
    prioridade?: boolean;
    nid_funcionario?: number;
  }): Promise<number> {
    const [senhaRows] = await this.pool.query<RowDataPacket[]>(
      `
      SELECT COALESCE(MAX(NumSenha), 0) + 1 AS proxima_senha
      FROM smt_master.tfila
      WHERE NidEmpresa = ?
        AND DesTipoFila = ?
        AND DATE(DatEntrada) = CURDATE()
      `,
      [params.nid_empresa, params.tipo_fila],
    );
    const nextPassword = Number(senhaRows[0]?.proxima_senha ?? 1);

    const [result] = await this.pool.query<ResultSetHeader>(
      `
      INSERT INTO smt_master.tfila
      (NidEmpresa, NidFuncionario, NomPaciente, DesCPF, DesRG, DatNascimento, NumSenha, FlgPrioridade, DesTipoFila, DesStatus, DatEntrada)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'AGUARDANDO', NOW())
      `,
      [
        params.nid_empresa,
        params.nid_funcionario ?? null,
        params.nome_paciente,
        params.cpf ?? null,
        params.rg ?? null,
        params.data_nascimento ?? null,
        nextPassword,
        params.prioridade ? 1 : 0,
        params.tipo_fila,
      ],
    );

    return Number(result.insertId);
  }

  async getNextPatient(nidEmpresa: number, tipoFila: string): Promise<Record<string, unknown> | null> {
    const [rows] = await this.pool.query<RowDataPacket[]>(
      `
      SELECT * FROM smt_master.tfila
      WHERE NidEmpresa = ?
        AND DesTipoFila = ?
        AND DesStatus = 'AGUARDANDO'
      ORDER BY FlgPrioridade DESC, DatEntrada ASC
      LIMIT 1
      `,
      [nidEmpresa, tipoFila],
    );
    return (rows[0] as Record<string, unknown>) ?? null;
  }

  async updateQueueStatus(nidFila: number, novoStatus: string): Promise<void> {
    let dateField = '';
    if (novoStatus === 'CHAMADO') {
      dateField = ', DatChamada = NOW()';
    } else if (novoStatus === 'ATENDIDO') {
      dateField = ', DatFim = NOW()';
    } else if (novoStatus === 'EM_ATENDIMENTO') {
      dateField = ', DatInicioAtendimento = NOW()';
    }

    await this.pool.query<ResultSetHeader>(
      `
      UPDATE smt_master.tfila
      SET DesStatus = ? ${dateField}
      WHERE NidFila = ?
      `,
      [novoStatus, nidFila],
    );
  }

  async getQueueList(nidEmpresa: number, tipoFila?: string): Promise<Record<string, unknown>[]> {
    const params: unknown[] = [nidEmpresa];
    let query = `
      SELECT * FROM smt_master.tfila
      WHERE NidEmpresa = ?
        AND DesStatus IN ('AGUARDANDO', 'CHAMADO', 'EM_ATENDIMENTO')
    `;

    if (tipoFila) {
      query += ' AND DesTipoFila = ?';
      params.push(tipoFila);
    }

    query += ' ORDER BY FlgPrioridade DESC, DatEntrada ASC';

    const [rows] = await this.pool.query<RowDataPacket[]>(query, params);
    return rows as Record<string, unknown>[];
  }
}