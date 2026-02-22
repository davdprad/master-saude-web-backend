export interface JwtPayload {
  role: string;
  access_level?: number;
  company_id?: number;
  employee_id?: number;
  sub?: string;
  [key: string]: unknown;
}

export interface EmployeeListResponse {
  employees: Record<string, unknown>[];
  total: number;
  total_ativos: number;
  total_inativos: number;
}

export interface CompaniesResponse {
  companies: Record<string, unknown>[];
  total: number;
  total_ativas: number;
  total_inativas: number;
}