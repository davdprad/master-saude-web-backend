import { IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin.master', description: 'Login do usuário' })
  @IsString()
  login!: string;

  @ApiProperty({ example: 'Senha@123', description: 'Senha do usuário' })
  @IsString()
  senha!: string;
}

export class TokenResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  access_token!: string;

  @ApiProperty({ example: 28800, description: 'Expiração em segundos' })
  access_token_expire!: number;

  @ApiProperty({ example: 'bearer' })
  token_type!: string;

  @ApiProperty({ example: 'master', enum: ['master', 'convenio', 'cliente'] })
  role!: string;

  @ApiProperty({ example: 'admin.master' })
  login!: string;

  @ApiPropertyOptional({ example: 1 })
  company_id?: number;

  @ApiPropertyOptional({ example: 55 })
  employee_id?: number;
}

export type TokenResponse = TokenResponseDto;