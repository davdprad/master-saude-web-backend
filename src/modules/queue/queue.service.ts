import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { QueueItemCreateDto, QueueStatusUpdateDto } from './dto/queue.dto';

@Injectable()
export class QueueService {
  constructor(private readonly databaseService: DatabaseService) {}

  async adicionarNaFila(item: QueueItemCreateDto): Promise<Record<string, unknown>> {
    try {
      const nidFila = await this.databaseService.addPatientToQueue({
        nid_empresa: item.nid_empresa,
        nome_paciente: item.nome_paciente,
        cpf: item.cpf,
        rg: item.rg,
        data_nascimento: item.data_nascimento,
        tipo_fila: item.tipo_fila,
        prioridade: item.prioridade ?? false,
        nid_funcionario: item.nid_funcionario,
      });

      return {
        message: 'Cadastro realizado com sucesso',
        nid_fila: nidFila,
        paciente: item.nome_paciente,
      };
    } catch (error) {
      throw new InternalServerErrorException(error instanceof Error ? error.message : 'Erro interno');
    }
  }

  async listarFila(nidEmpresa: number, tipoFila?: string): Promise<Record<string, unknown>[]> {
    try {
      return this.databaseService.getQueueList(nidEmpresa, tipoFila);
    } catch (error) {
      throw new InternalServerErrorException(error instanceof Error ? error.message : 'Erro interno');
    }
  }

  async chamarProximo(nidEmpresa: number, tipoFila: string): Promise<Record<string, unknown>> {
    try {
      const patient = await this.databaseService.getNextPatient(nidEmpresa, tipoFila);
      if (!patient) {
        throw new NotFoundException('Não há pacientes aguardando nesta fila.');
      }

      await this.databaseService.updateQueueStatus(Number(patient.NidFila), 'CHAMADO');

      return {
        message: 'Próximo paciente chamado',
        paciente: patient,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(error instanceof Error ? error.message : 'Erro interno');
    }
  }

  async atualizarStatus(nidFila: number, statusData: QueueStatusUpdateDto): Promise<Record<string, string>> {
    try {
      await this.databaseService.updateQueueStatus(nidFila, statusData.status);
      return { message: `Status atualizado para ${statusData.status}` };
    } catch (error) {
      throw new InternalServerErrorException(error instanceof Error ? error.message : 'Erro interno');
    }
  }
}