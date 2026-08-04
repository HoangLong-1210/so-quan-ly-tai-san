import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../../auth/auth.service';
import { PUBLIC_KEY } from '../decorators/roles.decorator';

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

    const req = ctx.switchToHttp().getRequest();
    const res = ctx.switchToHttp().getResponse();
    let payload = this.verify(
      req.cookies?.access_token,
      process.env.JWT_SECRET,
    );

    if (!payload) {
      payload = this.verify(
        req.cookies?.refresh_token,
        process.env.JWT_REFRESH_SECRET,
      );
      if (!payload) {
        throw new UnauthorizedException('Phiên đăng nhập đã hết hạn');
      }
      const user = await this.auth.findById(payload.sub);
      if (!user) throw new UnauthorizedException('Phiên đăng nhập đã hết hạn');
      const { accessToken } = this.auth.issueTokens(user);
      res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 15 * 60 * 1000,
      });
    }

    const user = await this.auth.findById(payload.sub);
    if (!user) throw new UnauthorizedException('Phiên đăng nhập đã hết hạn');
    req.user = user;
    return true;
  }

  private verify(token: string | undefined, secret: string | undefined) {
    if (!token) return null;
    try {
      return this.jwt.verify(token, { secret });
    } catch {
      return null;
    }
  }
}
