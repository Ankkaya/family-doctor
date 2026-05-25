import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { HouseholdsService } from './households.service';

describe('HouseholdsService', () => {
  function createService(overrides: Record<string, unknown> = {}) {
    const prisma = {
      householdMember: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      appUser: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      household: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        updateMany: jest.fn(),
      },
      householdMedicineInventory: {
        updateMany: jest.fn(),
      },
      consultationSession: {
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((callback: (client: any) => Promise<unknown>) => callback(prisma)),
      ...overrides,
    };

    const service = new HouseholdsService(prisma as any);
    return { service, prisma };
  }

  it('resolves an explicit household only when the app user is an active member', async () => {
    const { service, prisma } = createService();
    prisma.householdMember.findFirst.mockResolvedValueOnce({
      householdId: 'household-1',
      userId: 'app-user-1',
    });

    const result = await service.resolveCurrentHousehold('app-user-1', 'household-1');

    expect(prisma.householdMember.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'app-user-1',
        householdId: 'household-1',
        deletedAt: null,
        household: {
          deletedAt: null,
        },
      },
      select: {
        householdId: true,
      },
    });
    expect(result).toEqual({
      appUserId: 'app-user-1',
      householdId: 'household-1',
    });
  });

  it('rejects an explicit household when the app user is not a member', async () => {
    const { service, prisma } = createService();
    prisma.householdMember.findFirst.mockResolvedValueOnce(null);

    await expect(service.resolveCurrentHousehold('app-user-1', 'other-household')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('falls back to the user default household and verifies membership', async () => {
    const { service, prisma } = createService();
    prisma.appUser.findFirst.mockResolvedValueOnce({
      defaultHouseholdId: 'default-household',
    });
    prisma.householdMember.findFirst.mockResolvedValueOnce({
      householdId: 'default-household',
    });

    const result = await service.resolveCurrentHousehold('app-user-1');

    expect(prisma.appUser.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'app-user-1',
        deletedAt: null,
        status: 'active',
      },
      select: {
        defaultHouseholdId: true,
      },
    });
    expect(result.householdId).toBe('default-household');
  });

  it('uses the first active membership when no default household is set', async () => {
    const { service, prisma } = createService();
    prisma.appUser.findFirst.mockResolvedValueOnce({
      defaultHouseholdId: null,
    });
    prisma.householdMember.findFirst.mockResolvedValueOnce({
      householdId: 'first-household',
    });

    const result = await service.resolveCurrentHousehold('app-user-1');

    expect(prisma.householdMember.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'app-user-1',
        deletedAt: null,
        household: {
          deletedAt: null,
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
      select: {
        householdId: true,
      },
    });
    expect(prisma.appUser.update).toHaveBeenCalledWith({
      where: { id: 'app-user-1' },
      data: { defaultHouseholdId: 'first-household' },
    });
    expect(result.householdId).toBe('first-household');
  });

  it('returns not found when the app user has no household', async () => {
    const { service, prisma } = createService();
    prisma.appUser.findFirst.mockResolvedValueOnce({
      defaultHouseholdId: null,
    });
    prisma.householdMember.findFirst.mockResolvedValueOnce(null);

    await expect(service.resolveCurrentHousehold('app-user-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a household with a random six-character hexadecimal code and owner membership', async () => {
    const { service, prisma } = createService();
    prisma.household.findFirst.mockResolvedValueOnce(null);
    prisma.household.create.mockImplementationOnce(({ data }) => Promise.resolve({
      id: 'household-1',
      ...data,
    }));

    const result = await service.create('app-user-1', { name: '我的家庭' });

    expect(prisma.household.create).toHaveBeenCalledWith({
      data: {
        name: '我的家庭',
        ownerUserId: 'app-user-1',
        code: expect.stringMatching(/^[0-9A-F]{6}$/),
      },
    });
    expect(prisma.householdMember.create).toHaveBeenCalledWith({
      data: {
        householdId: 'household-1',
        userId: 'app-user-1',
        role: 'owner',
        displayName: null,
      },
    });
    expect(result.code).toMatch(/^[0-9A-F]{6}$/);
  });

  it('joins a household by six-character code and sets it as default', async () => {
    const { service, prisma } = createService();
    prisma.household.findFirst.mockResolvedValueOnce({
      id: 'household-1',
      name: '我的家庭',
      code: 'A3F91C',
    });
    prisma.householdMember.findFirst.mockResolvedValueOnce(null);
    prisma.householdMember.create.mockResolvedValueOnce({
      id: 'member-1',
      householdId: 'household-1',
      userId: 'app-user-2',
      role: 'member',
    });

    const result = await service.joinByCode('app-user-2', { code: ' a3f91c ' });

    expect(prisma.household.findFirst).toHaveBeenCalledWith({
      where: {
        code: 'A3F91C',
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        code: true,
      },
    });
    expect(prisma.householdMember.create).toHaveBeenCalledWith({
      data: {
        householdId: 'household-1',
        userId: 'app-user-2',
        role: 'member',
        displayName: null,
      },
    });
    expect(prisma.appUser.update).toHaveBeenCalledWith({
      where: { id: 'app-user-2' },
      data: { defaultHouseholdId: 'household-1' },
    });
    expect(result).toMatchObject({
      householdId: 'household-1',
    });
  });

  it('allows an owner to update another household member role and display name', async () => {
    const { service, prisma } = createService();
    prisma.householdMember.findFirst
      .mockResolvedValueOnce({ id: 'owner-member', role: 'owner' })
      .mockResolvedValueOnce({ id: 'member-1', userId: 'app-user-2' });
    prisma.householdMember.update.mockResolvedValueOnce({
      id: 'member-1',
      role: 'owner',
      displayName: '妈妈',
    });

    const result = await service.updateMember('app-user-1', 'household-1', 'member-1', {
      role: 'owner',
      displayName: '妈妈',
    });

    expect(prisma.householdMember.update).toHaveBeenCalledWith({
      where: { id: 'member-1' },
      data: {
        role: 'owner',
        displayName: '妈妈',
      },
    });
    expect(result.displayName).toBe('妈妈');
  });

  it('soft deletes a household and dependent active records for admin deletion', async () => {
    const { service, prisma } = createService();
    prisma.household.findFirst.mockResolvedValueOnce({ id: 'household-1' });
    prisma.household.updateMany.mockResolvedValueOnce({ count: 1 });
    prisma.householdMember.updateMany.mockResolvedValueOnce({ count: 2 });
    prisma.householdMedicineInventory.updateMany.mockResolvedValueOnce({ count: 3 });
    prisma.consultationSession.updateMany.mockResolvedValueOnce({ count: 4 });
    prisma.appUser.updateMany = jest.fn().mockResolvedValueOnce({ count: 1 });

    await expect(service.removeAdminHousehold('household-1')).resolves.toEqual({ success: true });

    expect(prisma.household.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'household-1',
        deletedAt: null,
      },
      data: {
        deletedAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
    });
    expect(prisma.householdMember.updateMany).toHaveBeenCalledWith({
      where: {
        householdId: 'household-1',
        deletedAt: null,
      },
      data: {
        deletedAt: expect.any(Date),
      },
    });
    expect(prisma.householdMedicineInventory.updateMany).toHaveBeenCalledWith({
      where: {
        householdId: 'household-1',
        deletedAt: null,
      },
      data: {
        deletedAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
    });
    expect(prisma.consultationSession.updateMany).toHaveBeenCalledWith({
      where: {
        householdId: 'household-1',
        deletedAt: null,
      },
      data: {
        deletedAt: expect.any(Date),
      },
    });
    expect(prisma.appUser.updateMany).toHaveBeenCalledWith({
      where: {
        defaultHouseholdId: 'household-1',
        deletedAt: null,
      },
      data: {
        defaultHouseholdId: null,
        updatedAt: expect.any(Date),
      },
    });
  });
});
