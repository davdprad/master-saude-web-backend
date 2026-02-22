import { IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMasterUserDto {
  @ApiProperty({ example: 'master.novo' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  login!: string;

  @ApiProperty({ example: 'Senha@1234' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  senha!: string;
}

export class CreateCompanyLoginDto {
  @ApiProperty({ example: 'convenio.acme' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  login!: string;

  @ApiProperty({ example: 'Senha@1234' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  senha!: string;

  @ApiProperty({ example: 10 })
  @IsInt()
  company_id!: number;

  @ApiProperty({ example: 2, description: 'Nível de acesso do convênio' })
  @IsInt()
  access_level!: number;
}

export class CreateEmployeeLoginDto {
  @ApiProperty({ example: 'cliente.joao' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  login!: string;

  @ApiProperty({ example: 'Senha@1234' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  senha!: string;

  @ApiProperty({ example: 55 })
  @IsInt()
  employee_id!: number;

  @ApiProperty({ example: 10 })
  @IsInt()
  company_id!: number;
}

export class RegisteredLoginUserDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'master.novo' })
  login!: string;

  @ApiProperty({ example: 'master' })
  role!: string;

  @ApiPropertyOptional({ example: 10, nullable: true })
  company_id?: number | null;

  @ApiPropertyOptional({ example: 55, nullable: true })
  employee_id?: number | null;

  @ApiPropertyOptional({ example: 2, nullable: true })
  access_level?: number | null;
}

export class RegisteredLoginUserListDto {
  @ApiProperty({ type: [RegisteredLoginUserDto] })
  users!: RegisteredLoginUserDto[];

  @ApiProperty({ example: 35 })
  total!: number;
}

export class CreatedLoginResponseDto {
  @ApiProperty({ example: 101 })
  id!: number;

  @ApiProperty({ example: 'cliente.joao' })
  login!: string;

  @ApiProperty({ example: 'cliente' })
  role!: string;

  @ApiPropertyOptional({ example: 10 })
  company_id?: number;

  @ApiPropertyOptional({ example: 55 })
  employee_id?: number;
}

export class DeleteLoginResponseDto {
  @ApiProperty({ example: 'Usuário excluído com sucesso' })
  message!: string;
}

export type RegisteredLoginUser = RegisteredLoginUserDto;
export type RegisteredLoginUserList = RegisteredLoginUserListDto;
export type CreatedLoginResponse = CreatedLoginResponseDto;
export type DeleteLoginResponse = DeleteLoginResponseDto;

export class ListRegisteredUsersQueryDto {
  @IsOptional()
  @IsInt()
  page?: number;

  @IsOptional()
  @IsInt()
  limit?: number;

  @IsOptional()
  @IsString()
  login?: string;

  @IsOptional()
  @IsString()
  role?: string;
}