import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '../../auth/auth.service';
import { SESSION_EXPIRED_MESSAGE } from '../guards/jwt-auth.guard';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<Request>();
    if (!request.user) {
      // JwtAuthGuard chạy trước và đặt request.user trên mọi route không
      // @Public(). Tới đây mà chưa có nghĩa là route thiếu guard hoặc cấu
      // hình @Public() sai — báo lỗi thay vì trả về giá trị rỗng im lặng.
      throw new UnauthorizedException(SESSION_EXPIRED_MESSAGE);
    }
    return request.user;
  },
);
