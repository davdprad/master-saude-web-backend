import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface AccessTokenPayload {
  sub: string;
  role: string;
  iat?: number;
  exp?: number;
  company_id?: number;
  employee_id?: number;
  access_level?: number;
}

@Injectable()
export class JwtAuthService {
  constructor(private readonly jwtService: JwtService) {}

  createAccessToken(payload: Omit<AccessTokenPayload, 'iat' | 'exp'>): string {
    return this.jwtService.sign(payload);
  }

  verifyToken(token: string): AccessTokenPayload {
    try {
      return this.jwtService.verify<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }
}