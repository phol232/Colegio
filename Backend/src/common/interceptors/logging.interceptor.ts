import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const startedAt = Date.now();
    const shouldLogUser = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const duration = Date.now() - startedAt;
          const userId = shouldLogUser
            ? request.user?.usuario_id ?? 'anon'
            : undefined;

          const parts = [
            method,
            url,
            response.statusCode,
            `${duration}ms`,
          ];

          if (userId !== undefined) {
            parts.push(`user=${userId}`);
          }

          this.logger.log(parts.join(' '));
        },
        error: (error: unknown) => {
          const duration = Date.now() - startedAt;
          const status =
            error && typeof error === 'object' && 'status' in error
              ? (error as { status: number }).status
              : 500;
          const userId = shouldLogUser
            ? request.user?.usuario_id ?? 'anon'
            : undefined;

          const parts = [method, url, status, `${duration}ms`];
          if (userId !== undefined) {
            parts.push(`user=${userId}`);
          }

          this.logger.warn(parts.join(' '));
        },
      }),
    );
  }
}
