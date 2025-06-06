import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import Cryptr = require('cryptr'); // Добавьте импорт Cryptr

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private cryptr: Cryptr;

  constructor() {
    if (!process.env.ENCRYPT_JWT_SECRET) {
      throw new Error('ENCRYPT_JWT_SECRET is not defined in environment variables!');
    }
    this.cryptr = new Cryptr(process.env.ENCRYPT_JWT_SECRET);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    let encryptedToken = this.extractTokenFromHeader(request);

    if (!encryptedToken) {
      throw new UnauthorizedException('No token provided');
    }

    let token: string;
    try {
      token = this.cryptr.decrypt(encryptedToken);
    } catch (e) {
      console.error('Token decryption failed:', e.message);
      throw new UnauthorizedException('Invalid token: decryption failed');
    }

    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        console.error('JWT_SECRET is not defined in environment variables!');
        throw new UnauthorizedException('Internal server error: JWT secret not configured.');
      }
      const decoded = jwt.verify(token, secret) as JwtPayload & { userId?: string };

      if (!decoded.userId) {
        console.log('userId not found in decoded token');
        throw new UnauthorizedException('Invalid token: userId missing.');
      }
      request.user = { id: decoded.userId };
    } catch (e) {
      console.error('Token verification failed:', e.name, e.message);
      throw new UnauthorizedException(`Invalid token: ${e.message}`);
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, tokenValue] = request.headers.authorization?.split(' ') ?? [];

    return type === 'Bearer' ? tokenValue : undefined;
  }
}
