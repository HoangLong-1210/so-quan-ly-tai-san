import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AuthUser = {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  orgUnitId: string;
};

const LOI_DANG_NHAP = 'Tên đăng nhập hoặc mật khẩu không đúng';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException(LOI_DANG_NHAP);
    }
    const khop = await bcrypt.compare(password, user.passwordHash);
    if (!khop) {
      throw new UnauthorizedException(LOI_DANG_NHAP);
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

  issueTokens(user: AuthUser) {
    const payload = {
      sub: user.id,
      role: user.role,
      orgUnitId: user.orgUnitId,
    };
    return {
      accessToken: this.jwt.sign(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: '15m',
      }),
      refreshToken: this.jwt.sign(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: '7d',
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
