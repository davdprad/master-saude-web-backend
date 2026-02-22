import { Injectable, ConflictException, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SecurityService } from '../auth/security.service';
import {
  CreateCompanyLoginDto,
  CreatedLoginResponse,
  CreateEmployeeLoginDto,
  CreateMasterUserDto,
  DeleteLoginResponse,
  RegisteredLoginUserList,
} from './dto/admin-users.dto';

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly securityService: SecurityService,
  ) {}

  async listRegisteredUsers(params: {
    page: number;
    limit: number;
    login?: string;
    role?: string;
  }): Promise<RegisteredLoginUserList> {
    try {
      const skip = (params.page - 1) * params.limit;
      const result = await this.databaseService.getRegisteredLogins({
        skip,
        limit: params.limit,
        login: params.login,
        role: params.role,
      });

      return {
        users: result.users.map((user) => ({
          id: Number(user.id),
          login: String(user.login),
          role: String(user.role),
          company_id: user.company_id !== null && user.company_id !== undefined ? Number(user.company_id) : null,
          employee_id: user.employee_id !== null && user.employee_id !== undefined ? Number(user.employee_id) : null,
          access_level: user.access_level !== null && user.access_level !== undefined ? Number(user.access_level) : null,
        })),
        total: result.total,
      };
    } catch {
      throw new InternalServerErrorException('Erro ao listar usuários cadastrados');
    }
  }

  async deleteRegisteredUser(userId: number): Promise<DeleteLoginResponse> {
    try {
      await this.databaseService.deleteRegisteredLogin(userId);
      return { message: 'Usuário excluído com sucesso' };
    } catch (error) {
      if (error instanceof Error && error.message === 'Usuário não encontrado') {
        throw new NotFoundException(error.message);
      }
      throw new InternalServerErrorException('Erro ao excluir usuário');
    }
  }

  async createMasterUser(body: CreateMasterUserDto): Promise<CreatedLoginResponse> {
    try {
      const senhaHash = await this.securityService.hashPassword(body.senha);
      const id = await this.databaseService.createMasterLogin(body.login, senhaHash);
      return { id, login: body.login, role: 'master' };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Login já')) {
          throw new ConflictException(error.message);
        }
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Erro ao cadastrar usuário master');
    }
  }

  async createCompanyLogin(body: CreateCompanyLoginDto): Promise<CreatedLoginResponse> {
    try {
      const senhaHash = await this.securityService.hashPassword(body.senha);
      const id = await this.databaseService.createCompanyLogin(
        body.login,
        senhaHash,
        body.company_id,
        body.access_level,
      );

      return {
        id,
        login: body.login,
        role: 'convenio',
        company_id: body.company_id,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Login já')) {
          throw new ConflictException(error.message);
        }
        if (error.message.includes('Empresa não encontrada')) {
          throw new NotFoundException(error.message);
        }
        throw new BadRequestException(error.message);
      }

      throw new InternalServerErrorException('Erro ao cadastrar login do convênio');
    }
  }

  async createEmployeeLogin(body: CreateEmployeeLoginDto): Promise<CreatedLoginResponse> {
    try {
      const senhaHash = await this.securityService.hashPassword(body.senha);
      const id = await this.databaseService.createEmployeeLogin(
        body.login,
        senhaHash,
        body.employee_id,
        body.company_id,
      );

      return {
        id,
        login: body.login,
        role: 'cliente',
        employee_id: body.employee_id,
        company_id: body.company_id,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('em uso')) {
          throw new ConflictException(error.message);
        }
        if (error.message.includes('não encontrado')) {
          throw new NotFoundException(error.message);
        }
        if (error.message.includes('não vinculado')) {
          throw new BadRequestException(error.message);
        }
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Erro ao cadastrar login do cliente');
    }
  }
}