import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('/')
  getRoot(): { message: string; docs: string } {
    return {
      message: 'API de Empresas e Funcionários',
      docs: '/docs',
    };
  }
}