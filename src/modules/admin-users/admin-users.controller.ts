import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminUsersService } from './admin-users.service';
import {
  CreateCompanyLoginDto,
  CreatedLoginResponseDto,
  CreateEmployeeLoginDto,
  CreateMasterUserDto,
  DeleteLoginResponseDto,
  RegisteredLoginUserListDto,
} from './dto/admin-users.dto';
import { JwtRolesGuard } from '../../common/guards/jwt-roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Registro de usuários')
@ApiBearerAuth()
@Controller('register')
@UseGuards(JwtRolesGuard)
@Roles('master')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get('usuarios')
  @ApiOperation({ summary: 'Lista usuários de login cadastrados' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'login', required: false, example: 'master' })
  @ApiQuery({ name: 'role', required: false, example: 'convenio' })
  @ApiResponse({ status: 200, type: RegisteredLoginUserListDto })
  listRegisteredUsers(
    @Query('page') pageRaw?: string,
    @Query('limit') limitRaw?: string,
    @Query('login') login?: string,
    @Query('role') role?: string,
  ): Promise<RegisteredLoginUserListDto> {
    const page = Number(pageRaw ?? 1);
    const limit = Number(limitRaw ?? 10);

    return this.adminUsersService.listRegisteredUsers({
      page,
      limit,
      login,
      role,
    });
  }

  @Post('usuarios/:user_id/excluir')
  @ApiOperation({ summary: 'Exclui usuário cadastrado por ID' })
  @ApiParam({ name: 'user_id', example: 101 })
  @ApiResponse({ status: 201, type: DeleteLoginResponseDto })
  deleteRegisteredUser(@Param('user_id', ParseIntPipe) userId: number): Promise<DeleteLoginResponseDto> {
    return this.adminUsersService.deleteRegisteredUser(userId);
  }

  @Post('master')
  @ApiOperation({ summary: 'Cria login master' })
  @ApiBody({ type: CreateMasterUserDto })
  @ApiResponse({ status: 201, type: CreatedLoginResponseDto })
  createMasterUser(@Body() body: CreateMasterUserDto): Promise<CreatedLoginResponseDto> {
    return this.adminUsersService.createMasterUser(body);
  }

  @Post('convenio')
  @ApiOperation({ summary: 'Cria login convênio' })
  @ApiBody({ type: CreateCompanyLoginDto })
  @ApiResponse({ status: 201, type: CreatedLoginResponseDto })
  createCompanyLogin(@Body() body: CreateCompanyLoginDto): Promise<CreatedLoginResponseDto> {
    return this.adminUsersService.createCompanyLogin(body);
  }

  @Post('cliente')
  @ApiOperation({ summary: 'Cria login cliente' })
  @ApiBody({ type: CreateEmployeeLoginDto })
  @ApiResponse({ status: 201, type: CreatedLoginResponseDto })
  createEmployeeLogin(@Body() body: CreateEmployeeLoginDto): Promise<CreatedLoginResponseDto> {
    return this.adminUsersService.createEmployeeLogin(body);
  }
}