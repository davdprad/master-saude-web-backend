import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import * as path from 'node:path';
import { EmployeesService } from './employees.service';
import { JwtRolesGuard } from '../../common/guards/jwt-roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtPayload } from './dto/employees.dto';

@ApiTags('Rotas de dados')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtRolesGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get('empresa/:nid_empresa/funcionarios')
  @Roles('master', 'convenio')
  @ApiOperation({ summary: 'Lista funcionários por empresa' })
  @ApiParam({ name: 'nid_empresa', example: 10 })
  @ApiResponse({ status: 200, description: 'Funcionários retornados com contadores' })
  getEmployees(@Param('nid_empresa', ParseIntPipe) nidEmpresa: number) {
    return this.employeesService.getEmployeesByCompany(nidEmpresa);
  }

  @Get('funcionarios-exames-agrupados')
  @Roles('master', 'convenio')
  @ApiOperation({ summary: 'Lista exames agrupados por funcionário' })
  @ApiQuery({ name: 'nid_empresa', required: false, example: 10 })
  @ApiQuery({ name: 'nid_funcionario', required: false, example: 55 })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'nome', required: false, example: 'João' })
  @ApiQuery({ name: 'empresa', required: false, example: 'ACME' })
  @ApiQuery({ name: 'cpf', required: false, example: '123' })
  @ApiQuery({ name: 'status', required: false, example: 1 })
  getEmployeesExamsGrouped(
    @Req() req: { user: JwtPayload },
    @Query('nid_empresa') nidEmpresaRaw?: string,
    @Query('nid_funcionario') nidFuncionarioRaw?: string,
    @Query('page') pageRaw?: string,
    @Query('limit') limitRaw?: string,
    @Query('nome') nome?: string,
    @Query('empresa') empresa?: string,
    @Query('cpf') cpf?: string,
    @Query('status') statusRaw?: string,
  ) {
    return this.employeesService.getEmployeesExamsGrouped(req.user, {
      nidEmpresa: nidEmpresaRaw ? Number(nidEmpresaRaw) : undefined,
      nidFuncionario: nidFuncionarioRaw ? Number(nidFuncionarioRaw) : undefined,
      page: Number(pageRaw ?? 1),
      limit: Number(limitRaw ?? 10),
      nome,
      empresa,
      cpf,
      status: statusRaw !== undefined ? Number(statusRaw) : undefined,
    });
  }

  @Get('masteruser-colaboradores-dados')
  @Roles('master', 'convenio')
  @ApiOperation({ summary: 'Lista colaboradores com filtros e paginação' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'nome', required: false, example: 'João' })
  @ApiQuery({ name: 'nidFuncionario', required: false, example: 55 })
  @ApiQuery({ name: 'empresa', required: false, example: 'ACME' })
  @ApiQuery({ name: 'nidEmpresa', required: false, example: 10 })
  @ApiQuery({ name: 'cpf', required: false, example: '123' })
  @ApiQuery({ name: 'status', required: false, example: 1 })
  getColaboradoresDados(
    @Query('page') pageRaw?: string,
    @Query('limit') limitRaw?: string,
    @Query('nome') nome?: string,
    @Query('nidFuncionario') nidFuncionarioRaw?: string,
    @Query('empresa') empresa?: string,
    @Query('nidEmpresa') nidEmpresaRaw?: string,
    @Query('cpf') cpf?: string,
    @Query('status') statusRaw?: string,
  ) {
    return this.employeesService.getColaboradoresDados({
      page: Number(pageRaw ?? 1),
      limit: Number(limitRaw ?? 10),
      nome,
      nidFuncionario: nidFuncionarioRaw ? Number(nidFuncionarioRaw) : undefined,
      empresa,
      nidEmpresa: nidEmpresaRaw ? Number(nidEmpresaRaw) : undefined,
      cpf,
      status: statusRaw !== undefined ? Number(statusRaw) : undefined,
    });
  }

  @Get('funcionario/:nid_funcionario/exames')
  @Roles('master', 'convenio', 'cliente')
  @ApiOperation({ summary: 'Lista exames de um funcionário' })
  @ApiParam({ name: 'nid_funcionario', example: 55 })
  @ApiQuery({ name: 'nid_empresa', required: false, example: 10 })
  getFuncionarioExames(
    @Req() req: { user: JwtPayload },
    @Param('nid_funcionario', ParseIntPipe) nidFuncionario: number,
    @Query('nid_empresa') nidEmpresaRaw?: string,
  ) {
    return this.employeesService.getFuncionarioExames(
      req.user,
      nidFuncionario,
      nidEmpresaRaw ? Number(nidEmpresaRaw) : undefined,
    );
  }

  @Get('exame/download/:nid_anexo')
  @Roles('master', 'convenio', 'cliente')
  @ApiOperation({ summary: 'Baixa arquivo de exame por anexo' })
  @ApiParam({ name: 'nid_anexo', example: 999 })
  async downloadExame(
    @Req() req: { user: JwtPayload },
    @Param('nid_anexo', ParseIntPipe) nidAnexo: number,
    @Res() res: Response,
  ): Promise<void> {
    const filePath = await this.employeesService.resolveExamFile(req.user, nidAnexo);
    res.sendFile(path.basename(filePath), { root: path.dirname(filePath) });
  }

  @Get('empresas')
  @Roles('master')
  @ApiOperation({ summary: 'Lista empresas com total de funcionários ativos' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'empresa', required: false, example: 'ACME' })
  @ApiQuery({ name: 'status', required: false, example: 1 })
  getEmpresasDados(
    @Query('page') pageRaw?: string,
    @Query('limit') limitRaw?: string,
    @Query('empresa') empresa?: string,
    @Query('status') statusRaw?: string,
  ) {
    return this.employeesService.getEmpresasDados({
      page: Number(pageRaw ?? 1),
      limit: Number(limitRaw ?? 10),
      empresa,
      status: statusRaw !== undefined ? Number(statusRaw) : undefined,
    });
  }
}