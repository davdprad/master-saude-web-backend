import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, TokenResponseDto } from './dto/login.dto';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private resolveClientIp(req: Request): string {
    return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
  }

  @Post('master/login')
  @ApiOperation({ summary: 'Login do perfil master' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 201, type: TokenResponseDto })
  loginMaster(@Body() body: LoginDto, @Req() req: Request): Promise<TokenResponseDto> {
    return this.authService.loginMaster(body, this.resolveClientIp(req));
  }

  @Post('convenio/login')
  @ApiOperation({ summary: 'Login do perfil convenio' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 201, type: TokenResponseDto })
  loginConvenio(@Body() body: LoginDto, @Req() req: Request): Promise<TokenResponseDto> {
    return this.authService.loginConvenio(body, this.resolveClientIp(req));
  }

  @Post('cliente/login')
  @ApiOperation({ summary: 'Login do perfil cliente' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 201, type: TokenResponseDto })
  loginCliente(@Body() body: LoginDto, @Req() req: Request): Promise<TokenResponseDto> {
    return this.authService.loginCliente(body, this.resolveClientIp(req));
  }
}