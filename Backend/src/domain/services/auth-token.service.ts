import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';

export const AUTH_TOKEN_EXPIRY_HOURS = 3;

@Injectable()
export class AuthTokenService {
  generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  getExpiresAt(from: Date = new Date()): Date {
    const expires = new Date(from);
    expires.setHours(expires.getHours() + AUTH_TOKEN_EXPIRY_HOURS);
    return expires;
  }

  isExpired(expiresAt: Date): boolean {
    return expiresAt.getTime() <= Date.now();
  }
}
