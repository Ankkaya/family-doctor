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
    const service = new ConsultationService(prisma as any, cabinetService as any, agentClient as any, householdsService as any);
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

  it('passes session summary and recent history to the agent', async () => {
    const { service, prisma, agentClient } = createService([]);
    prisma.$queryRaw
      .mockResolvedValueOnce([
        {
          id: 'session-1',
          userId: 'app-user-1',
          householdId: 'household-1',
          status: 'active',
          deletedAt: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'session-1',
          userId: 'app-user-1',
          householdId: 'household-1',
          title: '头痛',
          summary: {
            symptoms: ['头痛'],
            riskFlags: [],
            mentionedMedicines: ['布洛芬'],
            rejectedMedicines: [],
            recommendedMedicines: ['布洛芬'],
            temporaryUserFacts: [],
            unresolvedQuestions: [],
            suggestedStatus: 'active',
          },
          status: 'active',
          createdAt: new Date(),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'msg-1',
          sessionId: 'session-1',
          role: 'USER',
          content: '我头痛',
          recommends: null,
          createdAt: new Date('2026-06-18T08:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'session-1',
          userId: 'app-user-1',
          householdId: 'household-1',
          title: '头痛',
          summary: {
            symptoms: ['头痛'],
            riskFlags: [],
            mentionedMedicines: ['布洛芬'],
            rejectedMedicines: [],
            recommendedMedicines: ['布洛芬'],
            temporaryUserFacts: [],
            unresolvedQuestions: [],
            suggestedStatus: 'active',
          },
          status: 'active',
          createdAt: new Date(),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'msg-1',
          sessionId: 'session-1',
          role: 'USER',
          content: '我头痛',
          recommends: null,
          createdAt: new Date('2026-06-18T08:00:00.000Z'),
        },
        {
          id: 'msg-2',
          sessionId: 'session-1',
          role: 'USER',
          content: '那这个能饭后吃吗',
          recommends: null,
          createdAt: new Date('2026-06-18T08:05:00.000Z'),
        },
      ]);

    await service.ask(
      {
        sessionId: 'session-1',
        question: '那这个能饭后吃吗',
      },
      {
        appUserId: 'app-user-1',
        householdId: 'household-1',
      },
    );

    expect(agentClient.consult).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: 'session-1',
      sessionSummary: expect.objectContaining({
        symptoms: ['头痛'],
        mentionedMedicines: ['布洛芬'],
      }),
      historyMessages: [
        expect.objectContaining({ role: 'USER', content: '我头痛' }),
        expect.objectContaining({ role: 'USER', content: '那这个能饭后吃吗' }),
      ],
      conversationStatus: 'active',
    }));
  });

  it('starts a new session when the requested session is closed', async () => {
    const { service, prisma, agentClient } = createService([]);
    prisma.$queryRaw
      .mockResolvedValueOnce([
        {
          id: 'closed-session',
          userId: 'app-user-1',
          householdId: 'household-1',
          status: 'closed',
          deletedAt: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'closed-session',
          userId: 'app-user-1',
          householdId: 'household-1',
          title: '旧会话',
          summary: null,
          status: 'closed',
          createdAt: new Date(),
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'new-session',
          userId: 'app-user-1',
          householdId: 'household-1',
          title: '胃痛怎么办',
          summary: null,
          status: 'active',
          createdAt: new Date(),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'msg-new',
          sessionId: 'new-session',
          role: 'USER',
          content: '胃痛怎么办',
          recommends: null,
          createdAt: new Date('2026-06-18T09:00:00.000Z'),
        },
      ]);

    const result = await service.ask(
      {
        sessionId: 'closed-session',
        question: '胃痛怎么办',
      },
      {
        appUserId: 'app-user-1',
        householdId: 'household-1',
      },
    );

    expect(result.sessionId).not.toBe('closed-session');
    expect(agentClient.consult).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: expect.not.stringMatching(/^closed-session$/),
      conversationStatus: 'active',
    }));
  });

  it('uses summary plus recent messages for long sessions', async () => {
    const { service, prisma, agentClient } = createService([]);
    const oldMessages = Array.from({ length: 12 }, (_, index) => ({
      id: `msg-${index + 1}`,
      sessionId: 'session-long',
      role: index % 2 === 0 ? 'USER' : 'ASSISTANT',
      content: `历史消息 ${index + 1}`,
      recommends: null,
      createdAt: new Date(Date.UTC(2026, 5, 18, 8, index)),
    }));
    const summary = {
      symptoms: ['咳嗽'],
      riskFlags: [],
      mentionedMedicines: ['连花清瘟'],
      rejectedMedicines: [],
      recommendedMedicines: ['连花清瘟'],
      temporaryUserFacts: ['用户说自己高血压'],
      unresolvedQuestions: [],
      suggestedStatus: 'active',
    };

    prisma.$queryRaw
      .mockResolvedValueOnce([
        {
          id: 'session-long',
          userId: 'app-user-1',
          householdId: 'household-1',
          status: 'active',
          deletedAt: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'session-long',
          userId: 'app-user-1',
          householdId: 'household-1',
          title: '咳嗽',
          summary,
          status: 'active',
          createdAt: new Date(),
        },
      ])
      .mockResolvedValueOnce(oldMessages)
      .mockResolvedValueOnce([
        {
          id: 'session-long',
          userId: 'app-user-1',
          householdId: 'household-1',
          title: '咳嗽',
          summary,
          status: 'active',
          createdAt: new Date(),
        },
      ])
      .mockResolvedValueOnce([
        ...oldMessages,
        {
          id: 'msg-13',
          sessionId: 'session-long',
          role: 'USER',
          content: '那这个药还能吃吗',
          recommends: null,
          createdAt: new Date('2026-06-18T08:20:00.000Z'),
        },
      ]);

    await service.ask(
      {
        sessionId: 'session-long',
        question: '那这个药还能吃吗',
      },
      {
        appUserId: 'app-user-1',
        householdId: 'household-1',
      },
    );

    expect(agentClient.consult).toHaveBeenCalledWith(expect.objectContaining({
      sessionSummary: expect.objectContaining({
        symptoms: ['咳嗽'],
        temporaryUserFacts: ['用户说自己高血压'],
      }),
      historyMessages: [
        expect.objectContaining({ content: '历史消息 8' }),
        expect.objectContaining({ content: '历史消息 9' }),
        expect.objectContaining({ content: '历史消息 10' }),
        expect.objectContaining({ content: '历史消息 11' }),
        expect.objectContaining({ content: '历史消息 12' }),
        expect.objectContaining({ content: '那这个药还能吃吗' }),
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
