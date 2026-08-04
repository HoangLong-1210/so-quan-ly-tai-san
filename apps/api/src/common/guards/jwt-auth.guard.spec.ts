import { Test } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { JwtAuthGuard, SESSION_EXPIRED_MESSAGE } from './jwt-auth.guard';
import { AuthService, AuthUser, JwtPayload } from '../../auth/auth.service';
import {
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
} from '../config/session.config';

const testUser: AuthUser = {
  id: 'u1',
  username: 'admin',
  fullName: 'Quản trị viên',
  role: 'IT_ADMIN',
  orgUnitId: 'o1',
};

const testPayload: JwtPayload = {
  sub: testUser.id,
  role: testUser.role,
  orgUnitId: testUser.orgUnitId,
};

type FakeRequest = { cookies: Record<string, string>; user?: AuthUser };
type FakeResponse = { cookie: jest.Mock };

// ExecutionContext thật có nhiều phương thức không dùng tới trong guard này
// (switchToRpc, switchToWs, v.v.) — ép kiểu để chỉ cần dựng phần thật sự
// được gọi tới (switchToHttp, getHandler, getClass).
function createContext(cookies: Record<string, string>) {
  const request: FakeRequest = { cookies };
  const response: FakeResponse = { cookie: jest.fn() };
  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
  } as unknown as ExecutionContext;
  return { context, request, response };
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: JwtService;
  const authService = {
    findById: jest.fn(),
    issueTokens: jest.fn(),
  };

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      providers: [
        JwtAuthGuard,
        Reflector,
        { provide: AuthService, useValue: authService },
      ],
    }).compile();
    guard = moduleRef.get(JwtAuthGuard);
    jwtService = moduleRef.get(JwtService);
  });

  it('access token hợp lệ thì cho qua và đặt đúng request.user', async () => {
    const accessToken = jwtService.sign(testPayload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '15m',
    });
    const { context, request } = createContext({
      [ACCESS_TOKEN_COOKIE_NAME]: accessToken,
    });
    authService.findById.mockResolvedValue(testUser);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toEqual(testUser);
  });

  it('access token hết hạn nhưng refresh token còn hạn thì cấp cookie access mới và vẫn cho qua', async () => {
    const expiredAccessToken = jwtService.sign(testPayload, {
      secret: process.env.JWT_SECRET,
      expiresIn: -10,
    });
    const refreshToken = jwtService.sign(testPayload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });
    const { context, request, response } = createContext({
      [ACCESS_TOKEN_COOKIE_NAME]: expiredAccessToken,
      [REFRESH_TOKEN_COOKIE_NAME]: refreshToken,
    });
    authService.findById.mockResolvedValue(testUser);
    authService.issueTokens.mockReturnValue({
      accessToken: 'access-token-moi',
      refreshToken: 'refresh-token-moi',
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toEqual(testUser);
    expect(response.cookie).toHaveBeenCalledWith(
      ACCESS_TOKEN_COOKIE_NAME,
      'access-token-moi',
      expect.objectContaining({ httpOnly: true }),
    );
    // Trước đây findById bị gọi hai lần cho cùng một payload.sub khi làm mới
    // token — một lần để cấp token mới, một lần để đặt request.user.
    expect(authService.findById).toHaveBeenCalledTimes(1);
  });

  it('cả hai token đều hết hạn thì ném 401 với thông điệp tiếng Việt', async () => {
    const expiredAccessToken = jwtService.sign(testPayload, {
      secret: process.env.JWT_SECRET,
      expiresIn: -10,
    });
    const expiredRefreshToken = jwtService.sign(testPayload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: -10,
    });
    const { context } = createContext({
      [ACCESS_TOKEN_COOKIE_NAME]: expiredAccessToken,
      [REFRESH_TOKEN_COOKIE_NAME]: expiredRefreshToken,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(guard.canActivate(context)).rejects.toThrow(
      SESSION_EXPIRED_MESSAGE,
    );
  });
});
