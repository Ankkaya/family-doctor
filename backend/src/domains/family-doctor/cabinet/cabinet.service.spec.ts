import { CabinetService } from './cabinet.service';

function sqlText(value: any) {
  if (Array.isArray(value?.strings)) {
    return value.strings.join('');
  }
  if (Array.isArray(value?.sql)) {
    return value.sql.join('');
  }
  if (typeof value?.sql === 'string') {
    return value.sql;
  }
  return String(value);
}

describe('CabinetService', () => {
  function createService(rows: unknown[] = [], count = 0) {
    const prisma = {
      $queryRaw: jest.fn()
        .mockResolvedValueOnce(rows)
        .mockResolvedValueOnce([{ count }]),
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    const service = new CabinetService(prisma as any);
    return { service, prisma };
  }

  it('queries cabinet rows by resolved household, not by app user input', async () => {
    const { service, prisma } = createService([
      {
        inventoryId: 'inventory-1',
        householdId: 'household-1',
        medicineId: 'inventory-1',
        id: 'inventory-1',
        name: '布洛芬',
        aliases: [],
        otc: 'OTC',
        indication: '头痛',
        contraindication: null,
        adverseReaction: null,
        dosage: null,
        barcode: null,
        approvalNumber: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        quantity: 1,
        expireAt: '2026-12-31',
        source: 'manual',
        notes: null,
        inventoryCreatedAt: new Date('2026-01-01T00:00:00.000Z'),
        inventoryUpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ], 1);

    const result = await service.findCabinet({ page: 1, pageSize: 20 }, 'household-1');

    expect(sqlText(prisma.$queryRaw.mock.calls[0][0])).toContain('household_medicine_inventory');
    expect(sqlText(prisma.$queryRaw.mock.calls[0][0])).toContain('i.household_id =');
    expect(sqlText(prisma.$queryRaw.mock.calls[0][0])).not.toContain('medicine_catalog');
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      inventoryId: 'inventory-1',
      householdId: 'household-1',
      medicineId: 'inventory-1',
      name: '布洛芬',
    });
  });

  it('creates household-owned medicines from user-provided details', async () => {
    const { service, prisma } = createService([
      {
        inventoryId: 'inventory-1',
        householdId: 'household-1',
        medicineId: 'inventory-1',
        id: 'inventory-1',
        name: '自备感冒药',
        aliases: ['家里常用药'],
        otc: 'OTC',
        indication: '鼻塞、流涕',
        contraindication: '过敏者禁用',
        adverseReaction: '嗜睡',
        dosage: '按说明书使用',
        barcode: '6900000000000',
        approvalNumber: '国药准字Z00000000',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        quantity: 2,
        expireAt: '2026-12-31',
        source: 'manual',
        notes: '卧室抽屉',
        inventoryCreatedAt: new Date('2026-01-01T00:00:00.000Z'),
        inventoryUpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ], 1);

    await service.create({
      name: '自备感冒药',
      aliases: ['家里常用药'],
      otc: 'OTC',
      indication: '鼻塞、流涕',
      contraindication: '过敏者禁用',
      adverseReaction: '嗜睡',
      dosage: '按说明书使用',
      barcode: '6900000000000',
      approvalNumber: '国药准字Z00000000',
      quantity: 2,
      expireAt: '2026-12-31',
      source: 'manual',
      notes: '卧室抽屉',
    } as any, {
      appUserId: 'app-user-1',
      householdId: 'household-1',
    });

    const sql = sqlText(prisma.$executeRaw.mock.calls[0][0]);
    expect(sql).toContain('household_medicine_inventory');
    expect(sql).toContain('name');
    expect(sql).toContain('aliases');
    expect(sql).toContain('otc');
    expect(sql).toContain('indication');
    expect(sql).not.toContain('medicine_id');
  });

  it('updates household-owned medicine details and inventory metadata', async () => {
    const { service, prisma } = createService([
      {
        inventoryId: 'inventory-1',
        householdId: 'household-1',
        medicineId: 'inventory-1',
        id: 'inventory-1',
        name: '更新后的药',
        aliases: [],
        otc: 'OTC',
        indication: '头痛',
        contraindication: null,
        adverseReaction: null,
        dosage: null,
        barcode: null,
        approvalNumber: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        quantity: 3,
        expireAt: '2027-01-01',
        source: 'manual',
        notes: null,
        inventoryCreatedAt: new Date('2026-01-01T00:00:00.000Z'),
        inventoryUpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ], 1);

    await service.update('inventory-1', 'household-1', {
      name: '更新后的药',
      aliases: [],
      otc: 'OTC',
      indication: '头痛',
      quantity: 3,
      expireAt: '2027-01-01',
    } as any);

    const sql = sqlText(prisma.$queryRaw.mock.calls[0][0]);
    expect(sql).toContain('name = COALESCE');
    expect(sql).toContain('aliases = COALESCE');
    expect(sql).toContain('otc = COALESCE');
    expect(sql).toContain('indication = COALESCE');
    expect(sql).toContain('quantity = COALESCE');
    expect(sql).toContain('household_id =');
  });

  it('feeds agent candidates from current household inventory without catalog joins', async () => {
    const { service, prisma } = createService([
      {
        inventoryId: 'inventory-1',
        householdId: 'household-1',
        medicineId: 'inventory-1',
        id: 'inventory-1',
        name: '家庭自备药',
        aliases: [],
        otc: 'OTC',
        indication: '头痛',
        contraindication: '过敏者禁用',
        adverseReaction: null,
        dosage: null,
        barcode: null,
        approvalNumber: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        quantity: 1,
        expireAt: '2027-01-01',
        source: 'manual',
        notes: null,
        inventoryCreatedAt: new Date('2026-01-01T00:00:00.000Z'),
        inventoryUpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ], 1);

    const result = await service.findAgentBriefsByHousehold('household-1');

    const sql = sqlText(prisma.$queryRaw.mock.calls[0][0]);
    expect(sql).toContain('household_medicine_inventory');
    expect(sql).not.toContain('medicine_catalog');
    expect(result).toEqual([
      {
        id: 'inventory-1',
        name: '家庭自备药',
        otc: 'OTC',
        indication: '头痛',
        contraindication: '过敏者禁用',
        adverseReaction: null,
      },
    ]);
  });

  it('soft deletes inventory with both inventory id and household id', async () => {
    const { service, prisma } = createService();

    await service.remove('inventory-1', 'household-1');

    expect(sqlText(prisma.$executeRaw.mock.calls[0][0])).toContain('WHERE id =');
    expect(sqlText(prisma.$executeRaw.mock.calls[0][0])).toContain('household_id =');
  });

  it('soft deletes inventory by inventory id for admin deletion', async () => {
    const { service, prisma } = createService();

    await service.removeAdmin('inventory-1');

    const sql = sqlText(prisma.$executeRaw.mock.calls[0][0]);
    expect(sql).toContain('UPDATE household_medicine_inventory');
    expect(sql).toContain('WHERE id =');
    expect(sql).toContain('deleted_at IS NULL');
    expect(sql).not.toContain('household_id =');
  });
});
