import { CabinetController } from './cabinet.controller';
import { CabinetService } from './cabinet.service';
import { issueCabinetScope, verifyCabinetScope } from './cabinet-tool-scope';

describe('scoped cabinet tool', () => {
  const previous = process.env.AGENT_INTERNAL_TOKEN;
  beforeEach(() => { process.env.AGENT_INTERNAL_TOKEN = 'cabinet-test-secret'; });
  afterAll(() => { if (previous === undefined) delete process.env.AGENT_INTERNAL_TOKEN; else process.env.AGENT_INTERNAL_TOKEN = previous; });

  function setup() {
    const cabinet = { searchForAgent: jest.fn().mockResolvedValue([]) };
    const households = { resolveCurrentHousehold: jest.fn().mockResolvedValue({ householdId: 'family-1', appUserId: 'user-1' }) };
    const prisma = {
      appUser: { findFirst: jest.fn().mockResolvedValue({ id: 'user-1' }) },
      consultationSession: { findFirst: jest.fn().mockResolvedValue({ id: 'session-1' }) },
    };
    const controller = new CabinetController(cabinet as any, households as any, prisma as any);
    const scope = issueCabinetScope({ userId: 'user-1', householdId: 'family-1', sessionId: 'session-1' });
    const dto = { scope, mode: 'name' as const, names: ['布洛芬'], symptoms: '' };
    return { controller, cabinet, households, prisma, dto };
  }

  it('rejects forged and expired scopes', () => {
    const { dto } = setup();
    expect(() => verifyCabinetScope(`${dto.scope}extra`)).toThrow();
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 16 * 60_000);
    try { expect(() => verifyCabinetScope(dto.scope)).toThrow(); } finally { jest.restoreAllMocks(); }
  });

  it('rejects internal-token, membership, disabled-user and deleted-session failures before querying inventory', async () => {
    const { controller, cabinet, households, prisma, dto } = setup();
    await expect(controller.searchForAgent('wrong', dto)).rejects.toThrow();
    households.resolveCurrentHousehold.mockRejectedValueOnce(new Error('No membership'));
    await expect(controller.searchForAgent('cabinet-test-secret', dto)).rejects.toThrow();
    prisma.appUser.findFirst.mockResolvedValueOnce(null as any);
    await expect(controller.searchForAgent('cabinet-test-secret', dto)).rejects.toThrow();
    prisma.consultationSession.findFirst.mockResolvedValueOnce(null as any);
    await expect(controller.searchForAgent('cabinet-test-secret', dto)).rejects.toThrow();
    expect(cabinet.searchForAgent).not.toHaveBeenCalled();
  });

  it('uses the signed household scope even when untrusted arguments contain another household', async () => {
    const { controller, cabinet, households, prisma, dto } = setup();
    await controller.searchForAgent('cabinet-test-secret', { ...dto, householdId: 'other-family' } as any);
    expect(households.resolveCurrentHousehold).toHaveBeenCalledWith('user-1', 'family-1');
    expect(prisma.consultationSession.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'session-1', householdId: 'family-1', deletedAt: null } }));
    expect(cabinet.searchForAgent).toHaveBeenCalledWith('family-1', expect.anything());
  });
});

describe('cabinet exact and semantic retrieval', () => {
  const row = { id: 'inventory-1', name: '布洛芬', otc: 'OTC', indication: '头痛', searchScore: 0.8, notes: 'private', userPhone: 'private', embedding: 'private' };
  function setup(rows: unknown[] = [row]) {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue(rows), $executeRaw: jest.fn().mockResolvedValue(1) };
    const embeddings = { modelKey: 'model-v1', threshold: 0.72, embed: jest.fn().mockResolvedValue('[1,0]'), embedMany: jest.fn().mockResolvedValue(['[0,1]']) };
    return { service: new CabinetService(prisma as any, embeddings as any), prisma, embeddings };
  }

  it('lists only scoped usable inventory and returns quantity/expiry without Embedding', async () => {
    const { service, prisma, embeddings } = setup([{ ...row, quantity: 3, expireAt: '2027-10-01' }]);
    const result = await service.searchForAgent('family-1', { mode: 'inventory', names: [], symptoms: '' });
    const query = prisma.$queryRaw.mock.calls[0][0];
    expect(query.values).toContain('family-1');
    expect(query.sql).toContain('i.deleted_at IS NULL');
    expect(query.sql).toContain('i.quantity > 0');
    expect(query.sql).toContain('i.expire_at >= CURRENT_DATE');
    expect(query.sql).toContain('LIMIT 20');
    expect(result[0]).toMatchObject({ quantity: 3, expireAt: '2027-10-01', reference: { source: 'household_cabinet', matchType: 'inventory' } });
    expect(result[0]).not.toHaveProperty('notes');
    expect(embeddings.embed).not.toHaveBeenCalled();
  });

  it('matches normalized names and aliases without calling Embedding and strips non-public fields', async () => {
    const { service, prisma, embeddings } = setup();
    const result = await service.searchForAgent('family-1', { mode: 'name', names: [' 布洛芬 '], symptoms: '' });
    const query = prisma.$queryRaw.mock.calls[0][0];
    expect(query.sql).toContain('unnest(i.aliases)');
    expect(query.sql).not.toContain('ILIKE');
    expect(query.sql).toContain('i.quantity > 0');
    expect(query.sql).toContain('i.deleted_at IS NULL');
    expect(query.sql).toContain('i.expire_at >= CURRENT_DATE');
    expect(query.values).toContain('family-1');
    expect(query.values).toContainEqual(['布洛芬']);
    expect(embeddings.embed).not.toHaveBeenCalled();
    expect(result[0]).toMatchObject({ reference: { inventoryId: row.id, source: 'household_cabinet', matchType: 'exact' } });
    expect(result[0]).not.toHaveProperty('notes');
    expect(result[0]).not.toHaveProperty('userPhone');
    expect(result[0]).not.toHaveProperty('embedding');
  });

  it('does not broaden a missing drug name into symptom search', async () => {
    const { service, embeddings } = setup([]);
    expect(await service.searchForAgent('family-1', { mode: 'name', names: ['不存在的药'], symptoms: '头痛' })).toEqual([]);
    expect(embeddings.embed).not.toHaveBeenCalled();
  });

  it('backfills real embeddings and performs exact scoped kNN with a configured threshold', async () => {
    const { service, prisma, embeddings } = setup();
    prisma.$queryRaw.mockResolvedValueOnce([{ id: row.id, name: row.name, aliases: ['芬必得'], indication: row.indication, model: 'old-hash', hash: null }]).mockResolvedValueOnce([row]);
    const result = await service.searchForAgent('family-1', { mode: 'symptom', names: [], symptoms: '头痛' });
    expect(embeddings.embed).toHaveBeenCalledWith('头痛');
    expect(embeddings.embedMany).toHaveBeenCalledWith(['布洛芬 芬必得 头痛']);
    expect(prisma.$executeRaw).toHaveBeenCalled();
    const query = prisma.$queryRaw.mock.calls[1][0];
    expect(query.sql).toContain('scoped AS MATERIALIZED');
    expect(query.sql).toContain('semantic_embedding <=>');
    expect(query.sql).toContain('WHERE "searchScore" >=');
    expect(query.values).toContain(0.72);
    expect(query.values).toContain('model-v1');
    expect(query.values).toContain('family-1');
    expect(query.sql).not.toContain('OR i.embedding');
    expect(result[0].reference?.matchType).toBe('semantic');
  });

  it('fails explicitly when the embedding service is unavailable', async () => {
    const { service, prisma, embeddings } = setup();
    embeddings.embed.mockRejectedValueOnce(new Error('Unavailable'));
    await expect(service.searchForAgent('family-1', { mode: 'symptom', names: [], symptoms: '头痛' })).rejects.toThrow('Unavailable');
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });
});
