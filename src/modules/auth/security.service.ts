import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as argon2 from 'argon2';

@Injectable()
export class SecurityService {
  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
    });
  }

  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    const normalizedHash = hashedPassword.trim();

    if (normalizedHash.startsWith('$argon2')) {
      return argon2.verify(normalizedHash, plainPassword);
    }

    if (
      normalizedHash.startsWith('$2a$') ||
      normalizedHash.startsWith('$2b$') ||
      normalizedHash.startsWith('$2y$')
    ) {
      return bcrypt.compare(plainPassword, normalizedHash);
    }

    return false;
  }
}