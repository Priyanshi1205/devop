import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (response.headersSent) {
      return;
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let errorMessage = 'Internal server error';
    if (exception instanceof Error) {
      errorMessage = exception.message;
    } else if (typeof exception === 'string') {
      errorMessage = exception;
    } else if (exception && typeof exception === 'object') {
      errorMessage = (exception as any).message || JSON.stringify(exception);
    }

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : { statusCode: status, message: errorMessage };

    const payload = typeof message === 'string' ? { statusCode: status, message } : message;

    response
      .status(status)
      .header('Content-Type', 'application/json; charset=utf-8')
      .json(payload);
  }
}
