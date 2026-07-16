import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Error interno del servidor';
    let errors: unknown;
    let exceptionBody: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      exceptionBody = exception.getResponse();
      const body = exceptionBody;

      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object') {
        const obj = body as Record<string, unknown>;
        if (Array.isArray(obj.message)) {
          message = 'Error de validación';
          errors = obj.message;
        } else if (typeof obj.message === 'string') {
          message = obj.message;
        } else if (typeof obj.error === 'string') {
          message = obj.error;
        }

        if (obj.errors != null) {
          errors = obj.errors;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message || message;
    }

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(`${request.method} ${request.url} → ${status}: ${message}`);
    }

    const payload: {
      success: false;
      message: string;
      errors?: unknown;
      code?: string;
    } = {
      success: false,
      message,
    };

    if (errors != null) {
      payload.errors = errors;
    }

    if (
      exception instanceof HttpException &&
      typeof exceptionBody === 'object' &&
      exceptionBody != null &&
      typeof (exceptionBody as Record<string, unknown>).code === 'string'
    ) {
      payload.code = (exceptionBody as Record<string, unknown>).code as string;
    }

    response.status(status).json(payload);
  }
}
