import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { AuthUser } from '../../auth/auth.service';

function createContext(user: AuthUser | undefined) {
  const request = { user };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
  } as unknown as ExecutionContext;
}

const testUser: AuthUser = {
  id: 'u1',
  username: 'admin',
  fullName: 'Quản trị viên',
  role: 'IT_ADMIN',
  orgUnitId: 'o1',
};

describe('RolesGuard', () => {
  let guard: RolesGuard;
  const reflector = { getAllAndOverride: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('cho qua khi vai trò người dùng nằm trong danh sách @Roles', () => {
    reflector.getAllAndOverride.mockReturnValue(['IT_ADMIN']);
    const context = createContext(testUser);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('ném 403 khi vai trò không nằm trong danh sách @Roles', () => {
    reflector.getAllAndOverride.mockReturnValue(['UNIT_ADMIN']);
    const context = createContext(testUser);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
