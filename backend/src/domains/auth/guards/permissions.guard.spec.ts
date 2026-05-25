import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';

function createContext(userId: number) {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({
        user: { userId },
      }),
    }),
  } as any;
}

describe('PermissionsGuard', () => {
  it('allows users that have the required menu permission', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['system:user:view']),
    } as unknown as Reflector;
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          roles: [
            {
              code: 'operator',
              menus: [{ permission: 'system:user:view', path: '/system/users' }],
            },
          ],
        }),
      },
    } as any;
    const guard = new PermissionsGuard(reflector, prisma);

    await expect(guard.canActivate(createContext(1))).resolves.toBe(true);
  });

  it('allows admin role without checking individual permissions', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['system:user:delete']),
    } as unknown as Reflector;
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          roles: [{ code: 'admin', menus: [] }],
        }),
      },
    } as any;
    const guard = new PermissionsGuard(reflector, prisma);

    await expect(guard.canActivate(createContext(1))).resolves.toBe(true);
  });

  it('rejects users that do not have the required permission', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['system:user:delete']),
    } as unknown as Reflector;
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          roles: [
            {
              code: 'operator',
              menus: [{ permission: 'system:user:view', path: '/system/users' }],
            },
          ],
        }),
      },
    } as any;
    const guard = new PermissionsGuard(reflector, prisma);

    await expect(guard.canActivate(createContext(1))).rejects.toBeInstanceOf(ForbiddenException);
  });
});
