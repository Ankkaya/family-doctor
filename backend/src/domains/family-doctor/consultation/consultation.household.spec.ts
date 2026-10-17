import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConsultationService } from './consultation.service';

async function ask(service: ConsultationService, dto: { sessionId?: string; question: string }, current: any) {
  let sessionId = '';
  await service.askAgUiStream({
    threadId: dto.sessionId || crypto.randomUUID(), runId: crypto.randomUUID(),
    messages: [{ id: 'user-1', role: 'user', content: dto.question }],
    state: {}, tools: [], context: [], forwardedProps: { ...dto },
  }, current, event => { if (event.type === 'RUN_FINISHED') sessionId = event.threadId; });
  return { sessionId };
}

describe('ConsultationService household isolation', () => {
  function createService(sessionRows: unknown[] = []) {
    const tx = { $executeRaw: jest.fn().mockResolvedValue(1) };
    const committed: unknown[] = [];
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
      $transaction: jest.fn().mockImplementation(async callback => {
        const result = await callback(tx);
        committed.push(...tx.$executeRaw.mock.calls.map(call => call[0]));
        return result;
      }),
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
      agUiStream: jest.fn().mockImplementation(async (_input, onEvent) => {
        const output = {
        answer: '建议先休息并观察。',
        recommends: [],
        disclaimer: '请遵医嘱。',
        traces: [{ nodeName: 'parse', input: {}, output: {}, latencyMs: 0 }],
        sessionSummary: { symptoms: ['头痛'], suggestedStatus: 'active' },
      };
      await onEvent({ type: 'RUN_FINISHED', threadId: _input.threadId, runId: _input.runId, result: output });
      return output;
      }),
    };
    const householdsService = {
      listMembers: jest.fn().mockResolvedValue([]),
    };
    const audioStreamerService = {
      createAgUi: jest.fn(),
    };
    const service = new ConsultationService(
      prisma as any,
      cabinetService as any,
      agentClient as any,
      householdsService as any,
      audioStreamerService as any,
    );
    return { service, prisma, tx, committed, cabinetService, agentClient };
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
      ask(service,
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

    await ask(service,
      {
        question: '头痛怎么办',
      },
      {
        appUserId: 'app-user-1',
        householdId: 'household-1',
      },
    );

    expect(cabinetService.findAgentBriefsByHousehold).toHaveBeenCalledWith('household-1', '头痛怎么办');
    expect(agentClient.agUiStream).toHaveBeenCalledWith(expect.objectContaining({
      forwardedProps: expect.objectContaining({
      userProfile: expect.objectContaining({
        age: 30,
        gender: 'male',
      }),
      medicines: [
        expect.objectContaining({
          id: 'med-1',
        }),
      ],
      }),
    }), expect.any(Function));
  });

  it.each(['active', 'resolved', 'stale', 'closed'])('continues the requested %s session regardless of topic and age', async (status) => {
    const { service, prisma, agentClient } = createService([]);
    prisma.$queryRaw
      .mockResolvedValueOnce([{ id: 'session-1', householdId: 'household-1', status, deletedAt: null }])
      .mockResolvedValueOnce([{ id: 'session-1', status, summary: { symptoms: ['头痛'] } }])
      .mockResolvedValueOnce([{ role: 'USER', content: '旧消息', createdAt: new Date('2020-01-01') }]);

    const result = await ask(service,
      { sessionId: 'session-1', question: '换个问题，我妈胃痛怎么办' },
      { appUserId: 'app-user-1', householdId: 'household-1' },
    );

    expect(result.sessionId).toBe('session-1');
    expect(agentClient.agUiStream).toHaveBeenCalledWith(expect.objectContaining({ threadId: 'session-1' }), expect.any(Function));
  });

  it('creates a session when no conversation ID is provided', async () => {
    const { service } = createService([]);
    const result = await ask(service,
      { question: '头痛怎么办' },
      { appUserId: 'app-user-1', householdId: 'household-1' },
    );
    expect(result.sessionId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it.each([0, 6, 10, 13])('passes at most ten recent messages and the summary for %i messages', async (count) => {
    const { service, prisma, agentClient } = createService([]);
    const messages = Array.from({ length: count }, (_, index) => ({
      role: index % 2 === 0 ? 'USER' : 'ASSISTANT',
      content: `历史消息 ${index + 1}`,
      createdAt: new Date(Date.UTC(2026, 5, 18, 8, index)),
    }));
    prisma.$queryRaw
      .mockResolvedValueOnce([{ id: 'session-1', householdId: 'household-1', status: 'active', deletedAt: null }])
      .mockResolvedValueOnce([{ id: 'session-1', status: 'active', summary: {
        symptoms: ['咳嗽'], temporaryUserFacts: ['用户说自己高血压'],
      } }])
      .mockResolvedValueOnce(messages.slice(-10).reverse());

    await ask(service,
      { sessionId: 'session-1', question: '那这个药还能吃吗' },
      { appUserId: 'app-user-1', householdId: 'household-1' },
    );

    const input = agentClient.agUiStream.mock.calls[0][0].forwardedProps;
    expect(input.historyMessages).toHaveLength(Math.min(count, 10));
    expect(input.historyMessages.map((message: { content: string }) => message.content))
      .toEqual(messages.slice(-10).map(message => message.content));
    expect(input.sessionSummary).toEqual(expect.objectContaining({
      symptoms: ['咳嗽'], temporaryUserFacts: ['用户说自己高血压'],
    }));
    expect(input.history).toEqual(input.historyMessages.map(({ role, content }) => ({ role, content })));
    const queries = prisma.$queryRaw.mock.calls.map(call => call[0]);
    const historyQueries = queries.filter(query => query.sql.includes('FROM consultation_message'));
    expect(historyQueries).toHaveLength(1);
    expect(historyQueries[0].sql).toContain('ORDER BY created_at DESC, id DESC');
    expect(historyQueries[0].sql).toContain('LIMIT');
    expect(historyQueries[0].values).toContain(10);
  });
  it.each(['thread', 'state', 'forwarded'])('rejects foreign and deleted sessions selected through %s', async source => {
    for (const deleted of [false, true]) {
      const { service, prisma, agentClient } = createService([{ id: 'blocked', householdId: deleted ? 'household-1' : 'other', deletedAt: deleted ? new Date() : null }]);
      const input = {
        threadId: source === 'thread' ? 'blocked' : 'unused', runId: 'run-1',
        messages: [{ id: 'user-1', role: 'user' as const, content: '头痛怎么办' }],
        state: source === 'state' ? { sessionId: 'blocked' } : {}, tools: [], context: [],
        forwardedProps: source === 'forwarded' ? { sessionId: 'blocked' } : {},
      };
      await expect(service.askAgUiStream(input, { appUserId: 'app-user-1', householdId: 'household-1' }, () => {}))
        .rejects.toBeInstanceOf(deleted ? NotFoundException : ForbiddenException);
      expect(prisma.$executeRaw).not.toHaveBeenCalled();
      expect(agentClient.agUiStream).not.toHaveBeenCalled();
    }
  });

  it('commits the complete turn before forwarding completion', async () => {
    const { service, prisma, tx, committed } = createService([]);
    const events: string[] = [];
    await service.askAgUiStream({
      threadId: 'session-1', runId: 'run-1', state: {}, tools: [], context: [], forwardedProps: {},
      messages: [{ id: 'user', role: 'user', content: '头痛怎么办' }],
    }, { appUserId: 'app-user-1', householdId: 'household-1' }, event => {
      events.push(event.type);
      if (event.type === 'RUN_FINISHED') {
        const updates = tx.$executeRaw.mock.calls.map(call => call[0]);
        const summaryWrite = updates.find(query => query.sql.includes('summary = COALESCE'));
        expect(summaryWrite).toBeDefined();
        expect(summaryWrite.values.some((value: unknown) => typeof value === 'string' && value.includes('头痛'))).toBe(true);
        expect(committed).toHaveLength(4);
      }
    });
    expect(events).toEqual(['RUN_FINISHED']);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    const writes = tx.$executeRaw.mock.calls.map(call => call[0].sql);
    expect(writes[0]).toContain('INSERT INTO consultation_message');
    expect(writes[1]).toContain('INSERT INTO consultation_message');
    expect(writes[2]).toContain('UPDATE consultation_session');
    expect(writes[3]).toContain('INSERT INTO agent_trace');
    expect(tx.$executeRaw.mock.calls[0][0].values).toContain('USER');
    expect(tx.$executeRaw.mock.calls[1][0].values).toContain('ASSISTANT');
    const userDate = tx.$executeRaw.mock.calls[0][0].values.find((value: unknown) => value instanceof Date);
    const assistantDate = tx.$executeRaw.mock.calls[1][0].values.find((value: unknown) => value instanceof Date);
    expect(assistantDate.getTime()).toBeGreaterThan(userDate.getTime());
  });

  it('rolls back the result when the session is deleted before summary update', async () => {
    const { service, tx, committed } = createService([]);
    tx.$executeRaw.mockResolvedValueOnce(1).mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    const events: string[] = [];
    await service.askAgUiStream({
      threadId: 'session-1', runId: 'run-1', state: {}, tools: [], context: [], forwardedProps: {},
      messages: [{ id: 'user', role: 'user', content: '头痛怎么办' }],
    }, { appUserId: 'app-user-1', householdId: 'household-1' }, event => { events.push(event.type); });
    expect(events).toEqual(['RUN_ERROR']);
    expect(committed).toEqual([]);
  });

  it.each([0, 1, 2, 3])('does not commit or announce success when result write %i fails', async failAt => {
    const { service, prisma, tx, committed, agentClient } = createService([]);
    const output = { answer: '回复', recommends: [], disclaimer: '', sessionSummary: { symptoms: ['头痛'] }, traces: [{ nodeName: 'parse', input: {}, output: {} }] };
    agentClient.agUiStream.mockImplementationOnce(async (input, onEvent) => {
      await onEvent({ type: 'RUN_FINISHED', threadId: input.threadId, runId: input.runId, result: output });
      return output;
    });
    for (let index = 0; index < failAt; index++) tx.$executeRaw.mockResolvedValueOnce(1);
    tx.$executeRaw.mockRejectedValueOnce(new Error('保存失败'));
    const events: string[] = [];
    await service.askAgUiStream({
      threadId: 'session-1', runId: 'run-1', state: {}, tools: [], context: [], forwardedProps: {},
      messages: [{ id: 'user', role: 'user', content: '头痛怎么办' }],
    }, { appUserId: 'app-user-1', householdId: 'household-1' }, event => { events.push(event.type); });
    expect(events).toEqual(['RUN_ERROR']);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    expect(committed).toEqual([]);
  });

  it.each(['throws', 'error_event', 'missing_completion'])('saves no round messages when Agent %s', async mode => {
    const { service, prisma, tx, committed, agentClient } = createService([]);
    agentClient.agUiStream.mockImplementationOnce(async (_input, onEvent) => {
      // Before generation finishes, only the session shell may exist.
      expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
      expect(prisma.$executeRaw.mock.calls[0][0].sql).toContain('INSERT INTO consultation_session');
      expect(tx.$executeRaw).not.toHaveBeenCalled();
      if (mode === 'throws') throw new Error('模型失败');
      if (mode === 'error_event') await onEvent({ type: 'RUN_ERROR', message: '模型失败' });
      return { answer: '', recommends: [], disclaimer: '', traces: [] };
    });
    const events: string[] = [];
    await service.askAgUiStream({
      threadId: 'session-1', runId: 'run-1', state: {}, tools: [], context: [], forwardedProps: {},
      messages: [{ id: 'user', role: 'user', content: '头痛怎么办' }],
    }, { appUserId: 'app-user-1', householdId: 'household-1' }, event => { events.push(event.type); });
    expect(events).toEqual(['RUN_ERROR']);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.$executeRaw).not.toHaveBeenCalled();
    expect(committed).toEqual([]);
  });

  it('uses AG-UI for admin debugging and returns its collected result', async () => {
    const { service, agentClient } = createService([]);
    const result = await service.runDebug({ question: '头痛怎么办', historyMessages: [], sessionSummary: null } as any);
    expect(agentClient.agUiStream).toHaveBeenCalledWith(expect.objectContaining({
      forwardedProps: expect.objectContaining({ question: '头痛怎么办', historyMessages: [] }),
    }), expect.any(Function));
    expect(result.answer).toBe('建议先休息并观察。');
    expect(result.sessionSummary?.symptoms).toEqual(['头痛']);
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
