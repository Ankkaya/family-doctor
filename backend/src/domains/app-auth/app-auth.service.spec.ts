import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AppAuthService } from './app-auth.service';

describe('AppAuthService', () => {
  function createService(policy: Record<string, unknown> = {}) {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([
        {
          value: {
            code: 'REG2026',
            enabled: true,
            maxActivations: 2,
            usedActivations: 0,
            expiresAt: '2099-12-31T23:59:59+08:00',
            ...policy,
          },
        },
      ]),
      systemSetting: {
        update: jest.fn().mockResolvedValue({}),
      },
      appUser: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'app-user-1',
          username: 'alice',
          nickname: 'alice',
          defaultHouseholdId: null,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      household: {
        create: jest.fn().mockResolvedValue({
          id: 'household-1',
          name: '我的家庭',
        }),
      },
      householdMember: {
        create: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
      appUser: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    const jwt = {
      sign: jest.fn((payload: Record<string, unknown>, options?: Record<string, unknown>) => {
        return options?.expiresIn === '30d' ? 'app-refresh-token' : 'app-access-token';
      }),
    };
    const minio = {
      uploadFile: jest.fn(),
    };

    const service = new AppAuthService(prisma as any, jwt as any, minio as any);
    return { service, prisma, tx, jwt, minio };
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('registers an app user with username, password and a valid registration code', async () => {
    const { service, tx, jwt } = createService();
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password' as never);

    const result = await service.register({
      username: ' Alice ',
      password: 'secret123',
      registrationCode: 'REG2026',
    });

    expect(tx.appUser.findFirst).toHaveBeenCalledWith({
      where: {
        username: 'alice',
        deletedAt: null,
      },
      select: { id: true },
    });
    expect(tx.appUser.create).toHaveBeenCalledWith({
      data: {
        username: 'alice',
        passwordHash: 'hashed-password',
        nickname: 'alice',
        status: 'active',
      },
      select: {
        id: true,
        username: true,
        nickname: true,
        avatarUrl: true,
        age: true,
        gender: true,
        allergies: true,
        chronicDiseases: true,
        medicationHistory: true,
        defaultHouseholdId: true,
      },
    });
    expect(tx.systemSetting.update).toHaveBeenCalledWith({
      where: { key: 'app_registration_policy' },
      data: {
        value: expect.objectContaining({
          usedActivations: 1,
        }),
      },
    });
    expect(jwt.sign).toHaveBeenCalledWith({ sub: 'app-user-1', typ: 'app' }, expect.any(Object));
    expect(result).toMatchObject({
      token: 'app-access-token',
      refreshToken: 'app-refresh-token',
      user: {
        id: 'app-user-1',
        username: 'alice',
        nickname: 'alice',
        defaultHouseholdId: null,
      },
    });
  });

  it('creates anonymous owner membership without a default display name', async () => {
    const { service, tx } = createService();

    await service.createAnonymousIdentity();

    expect(tx.householdMember.create).toHaveBeenCalledWith({
      data: {
        householdId: 'household-1',
        userId: 'app-user-1',
        role: 'owner',
        displayName: null,
      },
    });
  });

  it('rejects registration when the registration code exceeds its activation limit', async () => {
    const { service } = createService({ usedActivations: 2, maxActivations: 2 });

    await expect(service.register({
      username: 'alice',
      password: 'secret123',
      registrationCode: 'REG2026',
    })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('logs in an app user with username and password', async () => {
    const { service, prisma } = createService();
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
    prisma.appUser.findFirst.mockResolvedValueOnce({
      id: 'app-user-1',
      username: 'alice',
      nickname: 'alice',
      passwordHash: 'hashed-password',
      defaultHouseholdId: 'household-1',
    });

    const result = await service.login({
      username: ' Alice ',
      password: 'secret123',
    });

    expect(prisma.appUser.findFirst).toHaveBeenCalledWith({
      where: {
        username: 'alice',
        deletedAt: null,
        status: 'active',
      },
      select: {
        id: true,
        username: true,
        nickname: true,
        avatarUrl: true,
        age: true,
        gender: true,
        allergies: true,
        chronicDiseases: true,
        medicationHistory: true,
        passwordHash: true,
        defaultHouseholdId: true,
      },
    });
    expect(result.user).toMatchObject({
      id: 'app-user-1',
      username: 'alice',
      defaultHouseholdId: 'household-1',
    });
  });

  it('rejects login when the password is invalid', async () => {
    const { service, prisma } = createService();
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
    prisma.appUser.findFirst.mockResolvedValueOnce({
      id: 'app-user-1',
      username: 'alice',
      passwordHash: 'hashed-password',
    });

    await expect(service.login({
      username: 'alice',
      password: 'wrong-password',
    })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('updates the current app user profile', async () => {
    const { service, prisma } = createService();
    prisma.appUser.update.mockResolvedValueOnce({
      id: 'app-user-1',
      username: 'alice',
      nickname: 'alice',
      avatarUrl: 'https://example.com/avatar.png',
      age: 36,
      gender: 'female',
      allergies: '青霉素',
      chronicDiseases: '高血压',
      medicationHistory: '布洛芬',
      defaultHouseholdId: 'household-1',
    });

    const result = await service.updateProfile('app-user-1', {
      avatarUrl: 'https://example.com/avatar.png',
      age: 36,
      gender: 'female',
      allergies: '青霉素',
      chronicDiseases: '高血压',
      medicationHistory: '布洛芬',
    });

    expect(prisma.appUser.update).toHaveBeenCalledWith({
      where: { id: 'app-user-1' },
      data: {
        avatarUrl: 'https://example.com/avatar.png',
        age: 36,
        gender: 'female',
        allergies: '青霉素',
        chronicDiseases: '高血压',
        medicationHistory: '布洛芬',
      },
      select: {
        id: true,
        username: true,
        nickname: true,
        avatarUrl: true,
        age: true,
        gender: true,
        allergies: true,
        chronicDiseases: true,
        medicationHistory: true,
        defaultHouseholdId: true,
      },
    });
    expect(result).toMatchObject({
      id: 'app-user-1',
      age: 36,
      gender: 'female',
      allergies: '青霉素',
      chronicDiseases: '高血压',
      medicationHistory: '布洛芬',
    });
  });

  it('normalizes empty profile text fields to null', async () => {
    const { service, prisma } = createService();
    prisma.appUser.update.mockResolvedValueOnce({
      id: 'app-user-1',
      username: 'alice',
      nickname: 'alice',
      avatarUrl: null,
      age: null,
      gender: null,
      allergies: null,
      chronicDiseases: null,
      medicationHistory: null,
      defaultHouseholdId: null,
    });

    await service.updateProfile('app-user-1', {
      avatarUrl: ' ',
      allergies: '',
      chronicDiseases: '   ',
      medicationHistory: '   ',
    });

    expect(prisma.appUser.update).toHaveBeenCalledWith(expect.objectContaining({
      data: {
        avatarUrl: null,
        allergies: null,
        chronicDiseases: null,
        medicationHistory: null,
      },
    }));
  });

  it('uploads and stores the current app user avatar', async () => {
    const { service, prisma, minio } = createService();
    const file = {
      originalname: 'avatar.png',
      mimetype: 'image/png',
      size: 1024,
      buffer: Buffer.from('avatar'),
    };
    minio.uploadFile.mockResolvedValueOnce({
      objectKey: 'app/avatar/app-user-1/100-avatar.png',
      url: 'http://localhost:3001/api/files/preview?filename=app%2Favatar%2Fapp-user-1%2F100-avatar.png',
      etag: 'etag',
    });
    prisma.appUser.update.mockResolvedValueOnce({
      id: 'app-user-1',
      username: 'alice',
      nickname: 'alice',
      avatarUrl: 'http://localhost:3001/api/files/preview?filename=app%2Favatar%2Fapp-user-1%2F100-avatar.png',
      age: null,
      gender: null,
      allergies: null,
      chronicDiseases: null,
      medicationHistory: null,
      defaultHouseholdId: null,
    });

    const result = await service.uploadAvatar('app-user-1', file as any);

    expect(minio.uploadFile).toHaveBeenCalledWith(file, 'app/avatar/app-user-1');
    expect(prisma.appUser.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'app-user-1' },
      data: {
        avatarUrl: 'http://localhost:3001/api/files/preview?filename=app%2Favatar%2Fapp-user-1%2F100-avatar.png',
      },
    }));
    expect(result.avatarUrl).toContain('/api/files/preview');
  });
});
