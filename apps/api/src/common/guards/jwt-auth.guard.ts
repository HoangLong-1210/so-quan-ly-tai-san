import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request, Response } from 'express';
import { AuthService } from '../../auth/auth.service';
import type { JwtPayload } from '../../auth/auth.service';
import { PUBLIC_KEY } from '../decorators/roles.decorator';
import {
  ACCESS_TOKEN_COOKIE_NAME,
  ACCESS_TOKEN_TTL_MS,
  REFRESH_TOKEN_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from '../config/session.config';

// Dùng chung với current-user.decorator.ts — cả hai nơi phải báo cùng một
// thông điệp khi phiên không còn hợp lệ.
export const SESSION_EXPIRED_MESSAGE = 'Phiên đăng nhập đã hết hạn';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly auth: AuthService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const request = ctx.switchToHttp().getRequest<Request>();
    const response = ctx.switchToHttp().getResponse<Response>();

    let payload = this.verify(
      request.cookies[ACCESS_TOKEN_COOKIE_NAME] as string | undefined,
      process.env.JWT_SECRET,
    );
    let needsFreshAccessToken = false;

    if (!payload) {
      payload = this.verify(
        request.cookies[REFRESH_TOKEN_COOKIE_NAME] as string | undefined,
        process.env.JWT_REFRESH_SECRET,
      );
      if (!payload) {
        throw new UnauthorizedException(SESSION_EXPIRED_MESSAGE);
      }
      needsFreshAccessToken = true;
    }

    // Chỉ gọi findById một lần: kết quả này vừa dùng để cấp lại access token
    // (nếu cần) vừa dùng để đặt request.user — trước đây gọi hai lần cho
    // cùng một payload.sub, tốn một truy vấn DB không cần thiết.
    const user = await this.auth.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException(SESSION_EXPIRED_MESSAGE);
    }

    if (needsFreshAccessToken) {
      const { accessToken } = this.auth.issueTokens(user);
      response.cookie(ACCESS_TOKEN_COOKIE_NAME, accessToken, {
        ...SESSION_COOKIE_OPTIONS,
        maxAge: ACCESS_TOKEN_TTL_MS,
      });
    }

    request.user = user;
    return true;
  }

  private verify(
    token: string | undefined,
    secret: string | undefined,
  ): JwtPayload | null {
    if (!token) return null;
    try {
      return this.jwt.verify<JwtPayload>(token, { secret });
    } catch {
      return null;
    }
  }
}
