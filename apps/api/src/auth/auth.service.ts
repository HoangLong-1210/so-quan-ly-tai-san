import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ACCESS_TOKEN_TTL_MS,
  REFRESH_TOKEN_TTL_MS,
} from '../common/config/session.config';

export type AuthUser = {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  orgUnitId: string;
};

// Payload đặt tên tường minh thay vì để jwt.sign()/jwt.verify() ngầm định
// kiểu `any` — RBAC của toàn hệ thống đọc payload.role sau khi giải mã.
export type JwtPayload = {
  sub: string;
  role: Role;
  orgUnitId: string;
};

const LOGIN_FAILED_MESSAGE = 'Tên đăng nhập hoặc mật khẩu không đúng';

// Hash bcrypt giả, không gắn với tài khoản nào. Dùng để so sánh mật khẩu khi
// không tìm thấy tài khoản, để nhánh "không tồn tại" tốn thời gian xử lý xấp
// xỉ nhánh "sai mật khẩu" (đều phải chạy bcrypt.compare một lần). Nếu bỏ so
// sánh này, kẻ tấn công đo thời gian phản hồi vẫn dò được username tồn tại
// dù thông điệp lỗi giống hệt nhau — đừng xóa vì tưởng là mã thừa.
const DUMMY_PASSWORD_HASH =
  '$2b$10$DBaJLzqD8XtDm3QnZUs4AuhOlEOMVZSK4Gfg0VMSwAF3ELMuFIY4G';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({ where: { username } });
    const passwordMatches = await bcrypt.compare(
      password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );
    if (!user || !user.isActive || !passwordMatches) {
      throw new UnauthorizedException(LOGIN_FAILED_MESSAGE);
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      orgUnitId: user.orgUnitId,
    };
  }

  issueTokens(user: AuthUser): { accessToken: string; refreshToken: string } {
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      orgUnitId: user.orgUnitId,
    };
    return {
      // expiresIn tính bằng giây, suy ra từ cùng hằng số mili-giây mà cookie
      // dùng cho maxAge — một nguồn duy nhất, không lệch hạn JWT với hạn cookie.
      accessToken: this.jwt.sign(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: ACCESS_TOKEN_TTL_MS / 1000,
      }),
      refreshToken: this.jwt.sign(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: REFRESH_TOKEN_TTL_MS / 1000,
      }),
    };
  }

  async findById(id: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || !user.isActive) return null;
    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      orgUnitId: user.orgUnitId,
    };
  }
}
