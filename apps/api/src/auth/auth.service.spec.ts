import { Test } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

// bcrypt export các hàm native không cho phép jest.spyOn redefine trực tiếp
// (TypeError: Cannot redefine property). Bọc `compare` bằng jest.fn giữ
// nguyên hành vi thật để vẫn đếm được số lần gọi.
jest.mock('bcrypt', () => {
  const actualBcrypt = jest.requireActual('bcrypt');
  return { ...actualBcrypt, compare: jest.fn(actualBcrypt.compare) };
});

const testUser = {
  id: 'u1',
  username: 'admin',
  fullName: 'Quản trị viên',
  role: 'IT_ADMIN',
  orgUnitId: 'o1',
  isActive: true,
  passwordHash: bcrypt.hashSync('MatKhau@123', 10),
};

describe('AuthService', () => {
  let service: AuthService;
  const prisma = {
    user: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret' })],
      providers: [AuthService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it('trả về thông tin người dùng khi mật khẩu đúng', async () => {
    prisma.user.findUnique.mockResolvedValue(testUser);
    const result = await service.validateUser('admin', 'MatKhau@123');
    expect(result).toEqual({
      id: 'u1',
      username: 'admin',
      fullName: 'Quản trị viên',
      role: 'IT_ADMIN',
      orgUnitId: 'o1',
    });
  });

  it('từ chối khi mật khẩu sai', async () => {
    prisma.user.findUnique.mockResolvedValue(testUser);
    await expect(service.validateUser('admin', 'SaiMatKhau')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('từ chối khi tài khoản đã bị khóa', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...testUser, isActive: false });
    await expect(service.validateUser('admin', 'MatKhau@123')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('báo lỗi giống nhau khi sai tên đăng nhập và khi sai mật khẩu', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const unknownUserError = await service
      .validateUser('khongton', 'MatKhau@123')
      .catch((e) => e.message);
    prisma.user.findUnique.mockResolvedValue(testUser);
    const wrongPasswordError = await service
      .validateUser('admin', 'SaiMatKhau')
      .catch((e) => e.message);
    expect(unknownUserError).toBe(wrongPasswordError);
  });

  it('vẫn so sánh mật khẩu ngay cả khi không tìm thấy tài khoản, để không lộ thời gian phản hồi', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await service.validateUser('khongton', 'MatKhau@123').catch(() => undefined);
    expect(bcrypt.compare).toHaveBeenCalled();
  });
});
