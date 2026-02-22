import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { QueueService } from './queue.service';
import { QueueItemCreateDto, QueueStatusUpdateDto } from './dto/queue.dto';

@ApiTags('Fila')
@Controller('fila')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Post('adicionar')
  @ApiOperation({ summary: 'Adiciona paciente na fila' })
  @ApiBody({ type: QueueItemCreateDto })
  @ApiResponse({ status: 201, description: 'Paciente adicionado na fila' })
  adicionarNaFila(@Body() item: QueueItemCreateDto) {
    return this.queueService.adicionarNaFila(item);
  }

  @Get('listar/:nid_empresa')
  @ApiOperation({ summary: 'Lista fila ativa da empresa' })
  @ApiParam({ name: 'nid_empresa', example: 10 })
  @ApiQuery({ name: 'tipo_fila', required: false, example: 'TRIAGEM' })
  listarFila(
    @Param('nid_empresa', ParseIntPipe) nidEmpresa: number,
    @Query('tipo_fila') tipoFila?: string,
  ) {
    return this.queueService.listarFila(nidEmpresa, tipoFila);
  }

  @Post('chamar-proximo/:nid_empresa/:tipo_fila')
  @ApiOperation({ summary: 'Chama próximo paciente da fila' })
  @ApiParam({ name: 'nid_empresa', example: 10 })
  @ApiParam({ name: 'tipo_fila', example: 'TRIAGEM' })
  chamarProximo(
    @Param('nid_empresa', ParseIntPipe) nidEmpresa: number,
    @Param('tipo_fila') tipoFila: string,
  ) {
    return this.queueService.chamarProximo(nidEmpresa, tipoFila);
  }

  @Put(':nid_fila/status')
  @ApiOperation({ summary: 'Atualiza status da fila' })
  @ApiParam({ name: 'nid_fila', example: 120 })
  @ApiBody({ type: QueueStatusUpdateDto })
  atualizarStatus(
    @Param('nid_fila', ParseIntPipe) nidFila: number,
    @Body() statusData: QueueStatusUpdateDto,
  ) {
    return this.queueService.atualizarStatus(nidFila, statusData);
  }
}