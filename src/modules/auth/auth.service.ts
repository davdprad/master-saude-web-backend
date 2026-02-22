import { Injectable, UnauthorizedException, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { JwtAuthService } from './jwt-auth.service';
import { SecurityService } from './security.service';
import { LoginDto, TokenResponse } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly loginAttempts = new Map<string, { count: number; firstAttemptAt: number; blockedUntil?: number }>();
  private readonly maxAttempts = 5;
  private readonly windowMs = 15 * 60 * 1000;
  private readonly blockMs = 15 * 60 * 1000;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtAuthService: JwtAuthService,
    private readonly securityService: SecurityService,
  ) {}

  private getRateLimitKey(scope: string, login: string, clientIp: string): string {
    return `${scope}:${login.toLowerCase()}:${clientIp}`;
  }

  private ensureRateLimit(key: string): void {
    const now = Date.now();
    const entry = this.loginAttempts.get(key);

    if (!entry) {
      return;
    }

    if (entry.blockedUntil && entry.blockedUntil > now) {
      throw new HttpException(
        'Muitas tentativas de login. Tente novamente em alguns minutos.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (now - entry.firstAttemptAt > this.windowMs) {
      this.loginAttempts.delete(key);
    }
  }

  private registerFailedAttempt(key: string): void {
    const now = Date.now();
    const entry = this.loginAttempts.get(key);

    if (!entry || now - entry.firstAttemptAt > this.windowMs) {
      this.loginAttempts.set(key, {
        count: 1,
        firstAttemptAt: now,
      });
      return;
    }

    const updatedCount = entry.count + 1;
    const blockedUntil = updatedCount >= this.maxAttempts ? now + this.blockMs : undefined;

    this.loginAttempts.set(key, {
      count: updatedCount,
      firstAttemptAt: entry.firstAttemptAt,
      blockedUntil,
    });
  }

  private clearFailedAttempts(key: string): void {
    this.loginAttempts.delete(key);
  }

  async loginMaster(body: LoginDto, clientIp: string): Promise<TokenResponse> {
    const normalizedLogin = body.login.trim();
    const rateLimitKey = this.getRateLimitKey('master', normalizedLogin, clientIp);
    this.ensureRateLimit(rateLimitKey);

    const row = await this.databaseService.getMasterLoginByLogin(normalizedLogin);

    if (!row) {
      this.logger.warn(`Failed login attempt for master: ${normalizedLogin}`);
      this.registerFailedAttempt(rateLimitKey);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const valid = await this.securityService.verifyPassword(body.senha, row.senha_hash);
    if (!valid) {
      this.logger.warn(`Failed login attempt for master: ${normalizedLogin}`);
      this.registerFailedAttempt(rateLimitKey);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    this.clearFailedAttempts(rateLimitKey);

    const token = this.jwtAuthService.createAccessToken({
      role: 'master',
      sub: `master:${row.id}`,
    });

    return {
      access_token: token,
      access_token_expire: 28800,
      token_type: 'bearer',
      role: 'master',
      login: normalizedLogin,
    };
  }

  async loginConvenio(body: LoginDto, clientIp: string): Promise<TokenResponse> {
    const normalizedLogin = body.login.trim();
    const rateLimitKey = this.getRateLimitKey('convenio', normalizedLogin, clientIp);
    this.ensureRateLimit(rateLimitKey);

    const row = await this.databaseService.getCompanyLoginByLogin(normalizedLogin);

    if (!row) {
      this.registerFailedAttempt(rateLimitKey);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const valid = await this.securityService.verifyPassword(body.senha, row.senha_hash);
    if (!valid) {
      this.registerFailedAttempt(rateLimitKey);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    this.clearFailedAttempts(rateLimitKey);

    const companyId = Number(row.company_id);
    const token = this.jwtAuthService.createAccessToken({
      role: 'convenio',
      sub: `company:${companyId}`,
      company_id: companyId,
      access_level: row.AccessLevel ?? undefined,
    });

    return {
      access_token: token,
      access_token_expire: 28800,
      token_type: 'bearer',
      role: 'convenio',
      company_id: companyId,
      login: normalizedLogin,
    };
  }

  async loginCliente(body: LoginDto, clientIp: string): Promise<TokenResponse> {
    const normalizedLogin = body.login.trim();
    const rateLimitKey = this.getRateLimitKey('cliente', normalizedLogin, clientIp);
    this.ensureRateLimit(rateLimitKey);

    const row = await this.databaseService.getEmployeeLoginByLogin(normalizedLogin);

    if (!row) {
      this.logger.warn(`Failed login attempt for cliente: ${normalizedLogin}`);
      this.registerFailedAttempt(rateLimitKey);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const valid = await this.securityService.verifyPassword(body.senha, row.senha_hash);
    if (!valid) {
      this.logger.warn(`Failed login attempt for cliente: ${normalizedLogin}`);
      this.registerFailedAttempt(rateLimitKey);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    this.clearFailedAttempts(rateLimitKey);

    const employeeId = Number(row.employee_id);
    const companyId = row.company_id !== null && row.company_id !== undefined ? Number(row.company_id) : undefined;

    const token = this.jwtAuthService.createAccessToken({
      role: 'cliente',
      sub: `employee:${employeeId}`,
      employee_id: employeeId,
      company_id: companyId,
    });

    return {
      access_token: token,
      access_token_expire: 28800,
      token_type: 'bearer',
      role: 'cliente',
      employee_id: employeeId,
      company_id: companyId,
      login: normalizedLogin,
    };
  }
}