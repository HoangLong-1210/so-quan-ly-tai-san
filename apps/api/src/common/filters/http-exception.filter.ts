import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse() as any;
      return res.status(status).json({
        statusCode: status,
        message: Array.isArray(body?.message)
          ? 'Dữ liệu nhập vào không hợp lệ'
          : (body?.message ?? exception.message),
        code: body?.code ?? null,
        details: Array.isArray(body?.message) ? body.message : null,
      });
    }

    const traceId = randomUUID().slice(0, 8);
    this.logger.error(
      `[${traceId}] ${String(exception)}`,
      (exception as Error)?.stack,
    );
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: 500,
      message: `Đã xảy ra lỗi hệ thống. Vui lòng báo bộ phận IT kèm mã lỗi ${traceId}`,
      code: 'INTERNAL_ERROR',
      details: null,
    });
  }
}
