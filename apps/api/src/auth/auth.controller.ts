import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import type { AuthUser } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  ACCESS_TOKEN_COOKIE_NAME,
  ACCESS_TOKEN_TTL_MS,
  REFRESH_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_TTL_MS,
  SESSION_COOKIE_OPTIONS,
} from '../common/config/session.config';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.auth.validateUser(dto.username, dto.password);
    const { accessToken, refreshToken } = this.auth.issueTokens(user);
    res.cookie(ACCESS_TOKEN_COOKIE_NAME, accessToken, {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: ACCESS_TOKEN_TTL_MS,
    });
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
      ...SESSION_COOKIE_OPTIONS,
      maxAge: REFRESH_TOKEN_TTL_MS,
    });
    return user;
  }

  // @Public() để logout luôn dọn được cookie kể cả khi cả hai token đã hết
  // hạn — nếu không, JwtAuthGuard ném 401 trước khi tới đây và cookie rác
  // ở lại trình duyệt.
  @Public()
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, SESSION_COOKIE_OPTIONS);
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, SESSION_COOKIE_OPTIONS);
    return { message: 'Đã đăng xuất' };
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
