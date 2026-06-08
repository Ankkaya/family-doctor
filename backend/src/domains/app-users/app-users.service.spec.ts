import { NotFoundException } from '@nestjs/common';
import { AppUsersService } from './app-users.service';

describe('AppUsersService', () => {
  function createService() {
    const prisma = {
      appUser: {
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      householdMember: {
        updateMany: jest.fn(),
      },
      consultationSession: {
        updateMany: jest.fn(),
      },
      $queryRaw: jest.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ count: 0 }]),
      $transaction: jest.fn((callback: (client: any) => Promise<unknown>) => callback(prisma)),
    };

    const service = new AppUsersService(prisma as any);
    return { service, prisma };
  }

  it('soft deletes an app user and active household memberships', async () => {
    const { service, prisma } = createService();
    prisma.appUser.findFirst.mockResolvedValueOnce({ id: 'app-user-1' });
    prisma.appUser.updateMany.mockResolvedValueOnce({ count: 1 });
    prisma.householdMember.updateMany.mockResolvedValueOnce({ count: 2 });
    prisma.consultationSession.updateMany.mockResolvedValueOnce({ count: 3 });

    await expect(service.remove('app-user-1')).resolves.toEqual({ success: true });

    expect(prisma.appUser.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'app-user-1',
        deletedAt: null,
      },
      data: {
        deletedAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
    });
    expect(prisma.householdMember.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'app-user-1',
        deletedAt: null,
      },
      data: {
        deletedAt: expect.any(Date),
      },
    });
    expect(prisma.consultationSession.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'app-user-1',
        deletedAt: null,
      },
      data: {
        deletedAt: expect.any(Date),
      },
    });
  });

  it('rejects deleting a missing app user', async () => {
    const { service, prisma } = createService();
    prisma.appUser.findFirst.mockResolvedValueOnce(null);

    await expect(service.remove('missing-user')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('selects app user profile fields for admin list rows', async () => {
    const { service, prisma } = createService();

    await service.findAll({ page: 1, pageSize: 10 });

    const listQuery = JSON.stringify(prisma.$queryRaw.mock.calls[0][0]);
    expect(listQuery).toContain('u.age');
    expect(listQuery).toContain('u.gender');
    expect(listQuery).toContain('u.allergies');
    expect(listQuery).toContain('chronic_diseases');
    expect(listQuery).toContain('medication_history');
  });
});
