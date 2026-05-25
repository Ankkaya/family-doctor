import { UsersService } from './users.service';
import * as bcrypt from 'bcrypt';

describe('UsersService.update avatarUrl', () => {
  const now = new Date('2026-05-18T00:00:00.000Z');
  const role = {
    id: 1,
    name: '管理员',
    code: 'admin',
    description: null,
    createdAt: now,
    updatedAt: now,
  };

  function createService() {
    const prisma = {
      user: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const service = new UsersService(prisma as any, {} as any);

    return { service, prisma };
  }

  it('persists avatarUrl when creating a user', async () => {
    const { service, prisma } = createService();
    const hashSpy = jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password' as never);
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValueOnce({
      id: 1,
      username: 'avatar-user',
      email: 'avatar@example.com',
      name: '头像用户',
      avatarUrl: 'http://example.com/avatar.png',
      createdAt: now,
      updatedAt: now,
    });

    const result = await service.create({
      username: 'avatar-user',
      password: 'plain-password',
      email: 'avatar@example.com',
      name: '头像用户',
      avatarUrl: 'http://example.com/avatar.png',
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        username: 'avatar-user',
        password: 'hashed-password',
        avatarUrl: 'http://example.com/avatar.png',
      }),
    });
    expect(result.avatarUrl).toBe('http://example.com/avatar.png');

    hashSpy.mockRestore();
  });

  it('persists avatarUrl when updating a user profile', async () => {
    const { service, prisma } = createService();
    prisma.user.findFirst.mockResolvedValueOnce({
      id: 1,
      email: 'old@example.com',
      deletedAt: null,
    });
    prisma.user.update.mockResolvedValueOnce({
      id: 1,
      username: 'admin',
      email: 'admin@example.com',
      name: '管理员',
      avatarUrl: 'http://example.com/avatar.png',
      createdAt: now,
      updatedAt: now,
      roles: [role],
    });

    const result = await service.update(1, {
      email: 'admin@example.com',
      name: '管理员',
      avatarUrl: 'http://example.com/avatar.png',
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        email: 'admin@example.com',
        name: '管理员',
        avatarUrl: 'http://example.com/avatar.png',
      }),
      include: {
        roles: true,
      },
    });
    expect(result).toMatchObject({
      id: 1,
      avatarUrl: 'http://example.com/avatar.png',
      roles: [{ code: 'admin' }],
    });
  });

  it('allows clearing avatarUrl with null', async () => {
    const { service, prisma } = createService();
    prisma.user.findFirst.mockResolvedValueOnce({
      id: 1,
      email: 'admin@example.com',
      deletedAt: null,
    });
    prisma.user.update.mockResolvedValueOnce({
      id: 1,
      username: 'admin',
      email: 'admin@example.com',
      name: '管理员',
      avatarUrl: null,
      createdAt: now,
      updatedAt: now,
      roles: [role],
    });

    const result = await service.update(1, {
      avatarUrl: null,
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        avatarUrl: null,
      }),
      include: {
        roles: true,
      },
    });
    expect(result.avatarUrl).toBeNull();
  });
});
