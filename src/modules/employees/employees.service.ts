import { Injectable, InternalServerErrorException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EmployeeListResponse, CompaniesResponse, JwtPayload } from './dto/employees.dto';
import * as fs from 'node:fs';
import * as path from 'node:path';

@Injectable()
export class EmployeesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getEmployeesByCompany(nidEmpresa: number): Promise<EmployeeListResponse> {
    try {
      const result = await this.databaseService.getEmployeesByCompany(nidEmpresa);
      return {
        employees: result.employees,
        total: result.counters.total,
        total_ativos: result.counters.total_ativos,
        total_inativos: result.counters.total_inativos,
      };
    } catch (error) {
      throw new InternalServerErrorException(error instanceof Error ? error.message : 'Erro interno');
    }
  }

  async getEmployeesExamsGrouped(
    payload: JwtPayload,
    params: {
      nidEmpresa?: number;
      nidFuncionario?: number;
      page: number;
      limit: number;
      nome?: string;
      empresa?: string;
      cpf?: string;
      status?: number;
    },
  ): Promise<Record<string, unknown>[]> {
    try {
      const onlyAso = payload.role === 'convenio' && Number(payload.access_level ?? 0) === 2;
      const skip = (params.page - 1) * params.limit;

      const result = await this.databaseService.getAllEmployeeExamsGrouped({
        skip,
        limit: params.limit,
        nidEmpresa: params.nidEmpresa,
        nidFuncionario: params.nidFuncionario,
        nome: params.nome,
        empresa: params.empresa,
        cpf: params.cpf,
        status: params.status,
        onlyAso,
      });

      return result.employees;
    } catch (error) {
      throw new InternalServerErrorException(error instanceof Error ? error.message : 'Erro interno');
    }
  }

  async getColaboradoresDados(params: {
    page: number;
    limit: number;
    nome?: string;
    nidFuncionario?: number;
    empresa?: string;
    nidEmpresa?: number;
    cpf?: string;
    status?: number;
  }): Promise<EmployeeListResponse> {
    const skip = (params.page - 1) * params.limit;
    const result = await this.databaseService.getAllEmployees({
      skip,
      limit: params.limit,
      nome: params.nome,
      nidFuncionario: params.nidFuncionario,
      empresa: params.empresa,
      nidEmpresa: params.nidEmpresa,
      cpf: params.cpf,
      status: params.status,
    });

    return {
      employees: result.employees,
      total: result.counters.total,
      total_ativos: result.counters.total_ativos,
      total_inativos: result.counters.total_inativos,
    };
  }

  async getFuncionarioExames(
    payload: JwtPayload,
    nidFuncionario: number,
    nidEmpresa?: number,
  ): Promise<Record<string, unknown>[]> {
    if (payload.role === 'cliente') {
      const employeeId = Number(payload.employee_id ?? 0);
      const companyId = payload.company_id !== undefined ? Number(payload.company_id) : undefined;

      if (!employeeId) {
        throw new ForbiddenException('Token do cliente inválido para acesso a exames');
      }
      if (employeeId !== nidFuncionario) {
        throw new ForbiddenException('Cliente só pode consultar os próprios exames');
      }
      if (nidEmpresa !== undefined && companyId !== undefined && companyId !== nidEmpresa) {
        throw new ForbiddenException('Empresa informada não corresponde ao token do cliente');
      }

      nidEmpresa = companyId ?? nidEmpresa;
    }

    const onlyAso = payload.role === 'convenio' && Number(payload.access_level ?? 0) === 2;
    return this.databaseService.getEmployeeExams(nidFuncionario, nidEmpresa, onlyAso);
  }

  async resolveExamFile(payload: JwtPayload, nidAnexo: number): Promise<string> {
    const onlyAso = payload.role === 'convenio' && Number(payload.access_level ?? 0) === 2;
    let filename: string | null = null;

    if (payload.role === 'master') {
      filename = await this.databaseService.getExamFilePath(nidAnexo, false);
    } else {
      const exam = await this.databaseService.getExamOwnershipByAnexo(nidAnexo, onlyAso);

      if (!exam?.path) {
        throw new NotFoundException('Registro do exame não encontrado.');
      }

      const tokenEmployeeId = payload.employee_id !== undefined ? Number(payload.employee_id) : undefined;
      const tokenCompanyId = payload.company_id !== undefined ? Number(payload.company_id) : undefined;

      if (payload.role === 'cliente') {
        if (!tokenEmployeeId || tokenEmployeeId !== exam.nidFuncionario) {
          throw new ForbiddenException('Acesso negado ao exame solicitado');
        }
        if (tokenCompanyId !== undefined && tokenCompanyId !== exam.nidEmpresa) {
          throw new ForbiddenException('Acesso negado ao exame solicitado');
        }
      }

      filename = exam.path;
    }

    if (!filename) {
      throw new NotFoundException('Registro do exame não encontrado.');
    }

    const examsPath = process.env.EXAMS_PATH ?? path.resolve(process.cwd(), 'exames');

    const filePath = path.join(examsPath, path.basename(filename));
    if (!path.resolve(filePath).startsWith(path.resolve(examsPath))) {
      throw new ForbiddenException('Acesso negado ao arquivo.');
    }
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Arquivo de exame não encontrado.');
    }

    return filePath;
  }

  async getEmpresasDados(params: {
    page: number;
    limit: number;
    empresa?: string;
    status?: number;
  }): Promise<CompaniesResponse> {
    const skip = (params.page - 1) * params.limit;
    const result = await this.databaseService.getCompaniesWithEmployeeCount({
      skip,
      limit: params.limit,
      empresa: params.empresa,
      status: params.status,
    });

    return {
      companies: result.companies,
      total: result.counters.total,
      total_ativas: result.counters.total_ativas,
      total_inativas: result.counters.total_inativas,
    };
  }
}