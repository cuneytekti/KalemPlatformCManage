import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { Repository } from 'typeorm';
import type { JwtPayload } from '../auth/jwt-auth.guard';
import { AuditLog } from '../entities/audit-log.entity';

/** Tüm yazma isteklerini (POST/PATCH/PUT/DELETE) denetim izine kaydeder. */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(@InjectRepository(AuditLog) private readonly logs: Repository<AuditLog>) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    if (req.method === 'GET' || req.path === '/api/auth/login') return next.handle();

    const write = (success: boolean) =>
      void this.logs
        .save(this.logs.create({
          userEmail: req.user?.email,
          method: req.method,
          path: req.path,
          success,
        }))
        .catch(() => undefined);

    return next.handle().pipe(
      tap({ next: () => write(true), error: () => write(false) }),
    );
  }
}
