import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConsultationService } from './consultation.service';

describe('ConsultationService household isolation', () => {
  function createService(sessionRows: unknown[] = []) {
    const prisma = {
      appUser: {
        findFirst: jest.fn().mockResolvedValue({
          age: 30,
          gender: 'male',
          allergies: null,
          chronicDiseases: null,
          medicationHistory: null,
        }),
      },
      $queryRaw: jest.fn().mockResolvedValue(sessionRows),
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    const cabinetService = {
      findAgentBriefsByHousehold: jest.fn().mockResolvedValue([
        {
          id: 'med-1',
          name: '布洛芬',
          otc: 'OTC',
          indication: '头痛',
          contraindication: null,
          adverseReaction: null,
        },
      ]),
    };
    const agentClient = {
      consult: jest.fn().mockResolvedValue({
        answer: '建议先休息并观察。',
        recommends: [],
        disclaimer: '请遵医嘱。',
        traces: [],
      }),
    };
    const householdsService = {
      listMembers: jest.fn().mockResolvedValue([]),
    };
    const ttsService = {
      synthesize: jest.fn(),
    };
    const service = new ConsultationService(
      prisma as any,
      cabinetService as any,
      agentClient as any,
      householdsService as any,
      ttsService as any,
    );
    return { service, prisma, cabinetService, agentClient };
  }

  it('rejects continuing a session that belongs to another household', async () => {
    const { service } = createService([
      {
        id: 'session-1',
        userId: 'app-user-2',
        householdId: 'other-household',
      },
    ]);

    await expect(
      service.ask(
        {
          sessionId: 'session-1',
          question: '头痛怎么办',
        },
        {
          appUserId: 'app-user-1',
          householdId: 'household-1',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('uses only the current household cabinet when asking the agent', async () => {
    const { service, cabinetService, agentClient } = createService([]);

    await service.ask(
      {
        question: '头痛怎么办',
      },
      {
        appUserId: 'app-user-1',
        householdId: 'household-1',
      },
    );

    expect(cabinetService.findAgentBriefsByHousehold).toHaveBeenCalledWith('household-1', '头痛怎么办');
    expect(agentClient.consult).toHaveBeenCalledWith(expect.objectContaining({
      userProfile: expect.objectContaining({
        age: 30,
        gender: 'male',
      }),
      medicines: [
        expect.objectContaining({
          id: 'med-1',
        }),
      ],
    }));
  });

  it('soft deletes a consultation session for admin deletion', async () => {
    const { service, prisma } = createService();

    await expect(service.removeAdmin('session-1')).resolves.toEqual({ success: true });

    const sql = String(prisma.$executeRaw.mock.calls[0][0]?.sql ?? prisma.$executeRaw.mock.calls[0][0]);
    expect(sql).toContain('UPDATE consultation_session');
    expect(sql).toContain('deleted_at = now()');
    expect(sql).toContain('WHERE id =');
    expect(sql).toContain('deleted_at IS NULL');
  });

  it('rejects deleting a missing consultation session', async () => {
    const { service, prisma } = createService();
    prisma.$executeRaw.mockResolvedValueOnce(0);

    await expect(service.removeAdmin('missing-session')).rejects.toBeInstanceOf(NotFoundException);
  });
});
