import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QueueItemCreateDto {
  @ApiProperty({ example: 10 })
  @IsInt()
  nid_empresa!: number;

  @ApiProperty({ example: 'João Silva' })
  @IsString()
  nome_paciente!: string;

  @ApiProperty({ example: '12345678901' })
  @IsString()
  cpf!: string;

  @ApiPropertyOptional({ example: 'MG1234567' })
  @IsOptional()
  @IsString()
  rg?: string;

  @ApiProperty({ example: '1990-05-10', description: 'Formato YYYY-MM-DD' })
  @IsString()
  data_nascimento!: string;

  @ApiProperty({ example: 'TRIAGEM' })
  @IsString()
  tipo_fila!: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  prioridade?: boolean;

  @ApiPropertyOptional({ example: 55 })
  @IsOptional()
  @IsInt()
  nid_funcionario?: number;
}

export class QueueStatusUpdateDto {
  @ApiProperty({ example: 'CHAMADO', enum: ['CHAMADO', 'ATENDIDO', 'CANCELADO', 'EM_ATENDIMENTO'] })
  @IsString()
  status!: string;
}