import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { AgentMedicineBrief } from '../agent-client/agent-client.types';
import { buildDeterministicEmbeddingText, buildSearchText } from '../search/embedding.util';
import { CurrentHousehold } from '@/domains/households/households.service';
import { CreateCabinetInventoryDto } from './dto/create-cabinet-inventory.dto';
import { QueryAdminCabinetDto } from './dto/query-admin-cabinet.dto';
import { QueryCabinetDto } from './dto/query-cabinet.dto';
import { UpdateCabinetInventoryDto } from './dto/update-cabinet-inventory.dto';

type CabinetRow = {
  inventoryId: string;
  householdId: string;
  householdName?: string;
  ownerUserId?: string;
  userNickname?: string | null;
  userPhone?: string | null;
  id: string;
  medicineId: string;
  name: string;
  aliases: string[];
  otc: 'OTC' | 'RX';
  indication: string;
  contraindication: string | null;
  adverseReaction: string | null;
  dosage: string | null;
  barcode: string | null;
  approvalNumber: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  quantity: number;
  expireAt: Date | string | null;
  source: string | null;
  notes: string | null;
  inventoryCreatedAt: Date | string;
  inventoryUpdatedAt: Date | string;
  searchScore?: number | string | null;
  searchSource?: string | null;
};

type CountRow = { count: bigint | number | string };

const SELECT_CABINET_COLUMNS = Prisma.sql`
  i.id as "inventoryId",
  i.household_id as "householdId",
  i.id,
  i.id as "medicineId",
  i.name,
  i.aliases,
  i.otc::text as otc,
  i.indication,
  i.contraindication,
  i.adverse_reaction as "adverseReaction",
  i.dosage,
  i.barcode,
  i.approval_number as "approvalNumber",
  i.created_at as "createdAt",
  i.updated_at as "updatedAt",
  i.quantity,
  i.expire_at as "expireAt",
  i.source,
  i.notes,
  i.created_at as "inventoryCreatedAt",
  i.updated_at as "inventoryUpdatedAt"
`;

const SELECT_ADMIN_CABINET_COLUMNS = Prisma.sql`
  ${SELECT_CABINET_COLUMNS},
  h.name as "householdName",
  h.owner_user_id as "ownerUserId",
  u.nickname as "userNickname",
  u.phone as "userPhone"
`;

@Injectable()
export class CabinetService {
  constructor(private readonly prisma: PrismaService) {}

  async findCabinet(query: QueryCabinetDto, householdId: string) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.buildCabinetWhere(householdId, query.keyword?.trim());

    const [items, countRows] = await Promise.all([
      this.prisma.$queryRaw<CabinetRow[]>(Prisma.sql`
        SELECT ${SELECT_CABINET_COLUMNS}
        FROM household_medicine_inventory i
        ${where}
        ORDER BY i.updated_at DESC
        LIMIT ${pageSize}
        OFFSET ${skip}
      `),
      this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*) as count
        FROM household_medicine_inventory i
        ${where}
      `),
    ]);

    return {
      items: items.map(this.normalizeRow),
      total: Number(countRows[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  async findAdminCabinet(query: QueryAdminCabinetDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.buildAdminCabinetWhere(query);

    const [items, countRows] = await Promise.all([
      this.prisma.$queryRaw<CabinetRow[]>(Prisma.sql`
        SELECT ${SELECT_ADMIN_CABINET_COLUMNS}
        FROM household_medicine_inventory i
        INNER JOIN household h ON h.id = i.household_id
        LEFT JOIN app_user u ON u.id = h.owner_user_id
        ${where}
        ORDER BY i.updated_at DESC
        LIMIT ${pageSize}
        OFFSET ${skip}
      `),
      this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*) as count
        FROM household_medicine_inventory i
        INNER JOIN household h ON h.id = i.household_id
        LEFT JOIN app_user u ON u.id = h.owner_user_id
        ${where}
      `),
    ]);

    return {
      items: items.map(this.normalizeRow),
      total: Number(countRows[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  async create(dto: CreateCabinetInventoryDto, current: CurrentHousehold) {
    const id = randomUUID();
    const medicine = this.normalizeCreateDto(dto);
    const expireAt = dto.expireAt?.trim() || null;
    const source = dto.source?.trim() || 'manual';
    const notes = dto.notes?.trim() || null;
    const embedding = this.buildMedicineEmbedding({
      ...medicine,
      notes,
    });

    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO household_medicine_inventory (
        id,
        household_id,
        name,
        aliases,
        otc,
        indication,
        contraindication,
        adverse_reaction,
        dosage,
        barcode,
        approval_number,
        quantity,
        expire_at,
        source,
        notes,
        created_by,
        embedding
      )
      VALUES (
        ${id},
        ${current.householdId},
        ${medicine.name},
        ${medicine.aliases},
        ${medicine.otc}::"OtcType",
        ${medicine.indication},
        ${medicine.contraindication},
        ${medicine.adverseReaction},
        ${medicine.dosage},
        ${medicine.barcode},
        ${medicine.approvalNumber},
        ${dto.quantity ?? 1},
        ${expireAt}::date,
        ${source},
        ${notes},
        ${current.appUserId},
        ${embedding}::vector
      )
    `);

    return this.findInventoryById(id, current.householdId);
  }

  async update(inventoryId: string, householdId: string, dto: UpdateCabinetInventoryDto) {
    const medicine = this.normalizeUpdateDto(dto);
    const embedding = this.buildMedicineEmbedding({
      name: medicine.name,
      aliases: medicine.aliases,
      indication: medicine.indication,
      contraindication: medicine.contraindication,
      adverseReaction: medicine.adverseReaction,
      dosage: medicine.dosage,
      notes: dto.notes?.trim() || null,
    });
    const rows = await this.prisma.$queryRaw<CabinetRow[]>(Prisma.sql`
      UPDATE household_medicine_inventory
      SET
        name = COALESCE(${medicine.name}, name),
        aliases = COALESCE(${medicine.aliases}, aliases),
        otc = COALESCE(${medicine.otc}::"OtcType", otc),
        indication = COALESCE(${medicine.indication}, indication),
        contraindication = COALESCE(${medicine.contraindication}, contraindication),
        adverse_reaction = COALESCE(${medicine.adverseReaction}, adverse_reaction),
        dosage = COALESCE(${medicine.dosage}, dosage),
        barcode = COALESCE(${medicine.barcode}, barcode),
        approval_number = COALESCE(${medicine.approvalNumber}, approval_number),
        quantity = COALESCE(${dto.quantity ?? null}, quantity),
        expire_at = COALESCE(${dto.expireAt?.trim() || null}::date, expire_at),
        source = COALESCE(${dto.source?.trim() || null}, source),
        notes = COALESCE(${dto.notes?.trim() || null}, notes),
        embedding = COALESCE(${embedding}::vector, embedding),
        updated_at = now()
      WHERE id = ${inventoryId}
        AND household_id = ${householdId}
        AND deleted_at IS NULL
      RETURNING id
    `);

    if (rows.length === 0) {
      throw new NotFoundException('家庭药箱库存不存在');
    }

    return this.findInventoryById(inventoryId, householdId);
  }

  async remove(inventoryId: string, householdId: string) {
    const affected = await this.prisma.$executeRaw(Prisma.sql`
      UPDATE household_medicine_inventory
      SET deleted_at = now(),
          updated_at = now()
      WHERE id = ${inventoryId}
        AND household_id = ${householdId}
        AND deleted_at IS NULL
    `);

    if (Number(affected) === 0) {
      throw new NotFoundException('家庭药箱库存不存在');
    }

    return { success: true };
  }

  async removeAdmin(inventoryId: string) {
    const affected = await this.prisma.$executeRaw(Prisma.sql`
      UPDATE household_medicine_inventory
      SET deleted_at = now(),
          updated_at = now()
      WHERE id = ${inventoryId}
        AND deleted_at IS NULL
    `);

    if (Number(affected) === 0) {
      throw new NotFoundException('家庭药箱库存不存在');
    }

    return { success: true };
  }

  async findAgentBriefsByHousehold(householdId: string, query?: string): Promise<AgentMedicineBrief[]> {
    const keyword = query?.trim();
    if (keyword) {
      return this.searchAgentBriefsByHousehold(householdId, keyword);
    }

    const rows = await this.prisma.$queryRaw<CabinetRow[]>(Prisma.sql`
      SELECT ${SELECT_CABINET_COLUMNS}
      FROM household_medicine_inventory i
      WHERE i.household_id = ${householdId}
        AND i.deleted_at IS NULL
        AND i.quantity > 0
      ORDER BY i.updated_at DESC
      LIMIT 500
    `);

    return rows.map((row) => ({
      id: row.medicineId,
      name: row.name,
      otc: row.otc,
      indication: row.indication,
      contraindication: row.contraindication,
      adverseReaction: row.adverseReaction,
      dosage: row.dosage,
    }));
  }

  private async searchAgentBriefsByHousehold(householdId: string, query: string): Promise<AgentMedicineBrief[]> {
    const like = `%${query}%`;
    const queryEmbedding = buildDeterministicEmbeddingText(query);
    const rows = await this.prisma.$queryRaw<CabinetRow[]>(Prisma.sql`
      WITH q AS (
        SELECT
          plainto_tsquery('simple', ${query}) AS text_query,
          ${queryEmbedding}::vector AS embedding_query
      )
      SELECT
        ${SELECT_CABINET_COLUMNS},
        (
          ts_rank_cd(i.search_vector, q.text_query) * 0.55
          + CASE
              WHEN i.embedding IS NOT NULL THEN (1 - (i.embedding <=> q.embedding_query)) * 0.35
              ELSE 0
            END
          + CASE
              WHEN i.name ILIKE ${like}
                OR i.indication ILIKE ${like}
                OR EXISTS (
                  SELECT 1
                  FROM unnest(i.aliases) alias
                  WHERE alias ILIKE ${like}
                )
              THEN 0.10
              ELSE 0
            END
        ) as "searchScore",
        CASE
          WHEN i.search_vector @@ q.text_query THEN 'fulltext'
          WHEN i.embedding IS NOT NULL THEN 'vector'
          ELSE 'keyword'
        END as "searchSource"
      FROM household_medicine_inventory i
      CROSS JOIN q
      WHERE i.household_id = ${householdId}
        AND i.deleted_at IS NULL
        AND i.quantity > 0
        AND (
          i.search_vector @@ q.text_query
          OR i.name ILIKE ${like}
          OR i.indication ILIKE ${like}
          OR EXISTS (
            SELECT 1
            FROM unnest(i.aliases) alias
            WHERE alias ILIKE ${like}
          )
          OR i.embedding IS NOT NULL
        )
      ORDER BY "searchScore" DESC, i.updated_at DESC
      LIMIT 20
    `);

    return rows.map((row) => ({
      id: row.medicineId,
      name: row.name,
      otc: row.otc,
      indication: row.indication,
      contraindication: row.contraindication,
      adverseReaction: row.adverseReaction,
      dosage: row.dosage,
      searchScore: Number(row.searchScore ?? 0),
      searchSource: row.searchSource ?? undefined,
    }));
  }

  private async findInventoryById(inventoryId: string, householdId: string) {
    const rows = await this.prisma.$queryRaw<CabinetRow[]>(Prisma.sql`
      SELECT ${SELECT_CABINET_COLUMNS}
      FROM household_medicine_inventory i
      WHERE i.id = ${inventoryId}
        AND i.household_id = ${householdId}
        AND i.deleted_at IS NULL
      LIMIT 1
    `);

    const row = rows[0];
    if (!row) {
      throw new NotFoundException('家庭药箱库存不存在');
    }

    return this.normalizeRow(row);
  }

  private buildCabinetWhere(householdId: string, keyword?: string) {
    if (!keyword) {
      return Prisma.sql`
        WHERE i.household_id = ${householdId}
          AND i.deleted_at IS NULL
      `;
    }

    const like = `%${keyword}%`;
    return Prisma.sql`
        WHERE i.household_id = ${householdId}
        AND i.deleted_at IS NULL
        AND (
          i.name ILIKE ${like}
          OR i.indication ILIKE ${like}
          OR EXISTS (
            SELECT 1
            FROM unnest(i.aliases) alias
            WHERE alias ILIKE ${like}
          )
        )
    `;
  }

  private buildAdminCabinetWhere(query: QueryAdminCabinetDto) {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`i.deleted_at IS NULL`,
      Prisma.sql`h.deleted_at IS NULL`,
    ];

    if (query.householdId?.trim()) {
      conditions.push(Prisma.sql`i.household_id = ${query.householdId.trim()}`);
    }
    if (query.userId?.trim()) {
      conditions.push(Prisma.sql`EXISTS (
        SELECT 1
        FROM household_member hm
        WHERE hm.household_id = h.id
          AND hm.user_id = ${query.userId.trim()}
          AND hm.deleted_at IS NULL
      )`);
    }
    if (query.keyword?.trim()) {
      const like = `%${query.keyword.trim()}%`;
      conditions.push(Prisma.sql`(
        h.name ILIKE ${like}
        OR i.name ILIKE ${like}
        OR i.indication ILIKE ${like}
        OR EXISTS (
          SELECT 1
          FROM unnest(i.aliases) alias
          WHERE alias ILIKE ${like}
        )
      )`);
    }
    if (query.expireStatus === 'expired') {
      conditions.push(Prisma.sql`i.expire_at IS NOT NULL AND i.expire_at < CURRENT_DATE`);
    }
    if (query.expireStatus === 'expiring') {
      conditions.push(Prisma.sql`i.expire_at IS NOT NULL AND i.expire_at >= CURRENT_DATE AND i.expire_at <= CURRENT_DATE + INTERVAL '30 day'`);
    }
    if (query.expireStatus === 'valid') {
      conditions.push(Prisma.sql`i.expire_at IS NOT NULL AND i.expire_at > CURRENT_DATE + INTERVAL '30 day'`);
    }
    if (query.expireStatus === 'unknown') {
      conditions.push(Prisma.sql`i.expire_at IS NULL`);
    }

    return Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
  }

  private normalizeRow(row: CabinetRow) {
    return {
      ...row,
      aliases: row.aliases ?? [],
    };
  }

  private normalizeCreateDto(dto: CreateCabinetInventoryDto) {
    return {
      name: dto.name.trim(),
      aliases: (dto.aliases ?? []).map((item) => item.trim()).filter(Boolean),
      otc: dto.otc,
      indication: dto.indication.trim(),
      contraindication: dto.contraindication?.trim() || null,
      adverseReaction: dto.adverseReaction?.trim() || null,
      dosage: dto.dosage?.trim() || null,
      barcode: dto.barcode?.trim() || null,
      approvalNumber: dto.approvalNumber?.trim() || null,
    };
  }

  private normalizeUpdateDto(dto: UpdateCabinetInventoryDto) {
    return {
      name: dto.name?.trim() || null,
      aliases: dto.aliases?.map((item) => item.trim()).filter(Boolean) ?? null,
      otc: dto.otc ?? null,
      indication: dto.indication?.trim() || null,
      contraindication: dto.contraindication?.trim() || null,
      adverseReaction: dto.adverseReaction?.trim() || null,
      dosage: dto.dosage?.trim() || null,
      barcode: dto.barcode?.trim() || null,
      approvalNumber: dto.approvalNumber?.trim() || null,
    };
  }

  private buildMedicineEmbedding(input: {
    name?: string | null;
    aliases?: string[] | null;
    indication?: string | null;
    contraindication?: string | null;
    adverseReaction?: string | null;
    dosage?: string | null;
    notes?: string | null;
  }) {
    const text = buildSearchText(input);
    return text ? buildDeterministicEmbeddingText(text) : null;
  }
}
