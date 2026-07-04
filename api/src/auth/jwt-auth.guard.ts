import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

/**
 * Global JWT guard. Token'ı Authorization: Bearer başlığından, yoksa
 * ?token= query parametresinden okur (EventSource/SSE başlık gönderemez).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    const header = req.headers.authorization;
    const token =
      (header?.startsWith('Bearer ') ? header.slice(7) : undefined) ??
      (typeof req.query.token === 'string' ? req.query.token : undefined);

    if (!token) throw new UnauthorizedException('Token gerekli');
    try {
      req.user = await this.jwt.verifyAsync<JwtPayload>(token);
      return true;
    } catch {
      throw new UnauthorizedException('Token geçersiz veya süresi dolmuş');
    }
  }
}
