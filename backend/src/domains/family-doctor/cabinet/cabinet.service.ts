import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { AgentMedicineBrief } from '../agent-client/agent-client.types';
import { MedicineEmbeddingService } from '../search/medicine-embedding.service';
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
  manufacturer: string | null;
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
  i.manufacturer,
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
  constructor(private readonly prisma: PrismaService, private readonly embeddings: MedicineEmbeddingService) {}

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
        manufacturer,
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
        ${medicine.manufacturer},
        ${dto.quantity ?? 1},
        ${expireAt}::date,
        ${source},
        ${notes},
        ${current.appUserId},
        NULL::vector
      )
    `);

    return this.findInventoryById(id, current.householdId);
  }

  async update(inventoryId: string, householdId: string, dto: UpdateCabinetInventoryDto) {
    const medicine = this.normalizeUpdateDto(dto);
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
        manufacturer = CASE WHEN ${dto.manufacturer !== undefined} THEN ${medicine.manufacturer} ELSE manufacturer END,
        quantity = COALESCE(${dto.quantity ?? null}, quantity),
        expire_at = COALESCE(${dto.expireAt?.trim() || null}::date, expire_at),
        source = COALESCE(${dto.source?.trim() || null}, source),
        notes = COALESCE(${dto.notes?.trim() || null}, notes),
        semantic_embedding = CASE WHEN ${dto.name !== undefined || dto.aliases !== undefined || dto.indication !== undefined} THEN NULL ELSE semantic_embedding END,
        semantic_embedding_model = CASE WHEN ${dto.name !== undefined || dto.aliases !== undefined || dto.indication !== undefined} THEN NULL ELSE semantic_embedding_model END,
        semantic_embedding_hash = CASE WHEN ${dto.name !== undefined || dto.aliases !== undefined || dto.indication !== undefined} THEN NULL ELSE semantic_embedding_hash END,
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

  /** Only user-visible clinical fields leave this service; never SELECT admin/owner/notes columns. */
  async searchForAgent(householdId: string, input: { mode: 'name' | 'symptom' | 'inventory'; names: string[]; symptoms: string }): Promise<AgentMedicineBrief[]> {
    const fields = Prisma.sql`i.id, i.name, i.otc::text AS otc, i.indication,
      i.contraindication, i.adverse_reaction AS "adverseReaction", i.dosage, i.quantity, i.expire_at::text AS "expireAt"`;
    const visible = Prisma.sql`i.household_id = ${householdId} AND i.deleted_at IS NULL
      AND i.quantity > 0 AND (i.expire_at IS NULL OR i.expire_at >= CURRENT_DATE)`;
    let rows: (AgentMedicineBrief & { aliases?: string[] })[];
    if (input.mode === 'inventory') {
      rows = await this.prisma.$queryRaw(Prisma.sql`
        SELECT ${fields} FROM household_medicine_inventory i
        WHERE ${visible} ORDER BY i.updated_at DESC, i.id LIMIT 20
      `);
    } else if (input.mode === 'name') {
      const names = input.names.map(name => name.normalize('NFKC').toLowerCase().replace(/\s+/gu, '')).filter(Boolean);
      if (!names.length) return [];
      rows = await this.prisma.$queryRaw(Prisma.sql`
        SELECT ${fields}, 1.0 AS "searchScore"
        FROM household_medicine_inventory i
        WHERE ${visible} AND (
          regexp_replace(lower(normalize(i.name, NFKC)), '[[:space:]]+', '', 'g') = ANY(${names}::text[])
          OR EXISTS (SELECT 1 FROM unnest(i.aliases) alias
            WHERE regexp_replace(lower(normalize(alias, NFKC)), '[[:space:]]+', '', 'g') = ANY(${names}::text[]))
        ) ORDER BY i.updated_at DESC, i.id LIMIT 20
      `);
    } else {
      if (!input.symptoms.trim()) return [];
      const model = this.embeddings.modelKey;
      const threshold = this.embeddings.threshold;
      const vector = await this.embeddings.embed(input.symptoms.trim());
      // Lazy backfill handles old inventory and model changes without mixing vector spaces.
      const inventory = await this.prisma.$queryRaw<{
        id: string; name: string; aliases: string[]; indication: string;
        model: string | null; hash: string | null;
      }[]>(Prisma.sql`
        SELECT i.id, i.name, i.aliases, i.indication,
          i.semantic_embedding_model AS model, i.semantic_embedding_hash AS hash
        FROM household_medicine_inventory i WHERE ${visible}
      `);
      const pending = inventory.map(item => {
        const text = [item.name, ...(item.aliases || []), item.indication].join(' ');
        const hash = createHash('sha256').update(text).digest('hex');
        return { ...item, text, newHash: hash };
      }).filter(item => item.model !== model || item.hash !== item.newHash);
      for (let offset = 0; offset < pending.length; offset += 32) {
        const batch = pending.slice(offset, offset + 32);
        const vectors = await this.embeddings.embedMany(batch.map(item => item.text));
        for (const [index, item] of batch.entries()) {
          // Concurrent edits must not receive an embedding generated from stale text.
          await this.prisma.$executeRaw(Prisma.sql`
            UPDATE household_medicine_inventory SET semantic_embedding = ${vectors[index]}::vector,
              semantic_embedding_model = ${model}, semantic_embedding_hash = ${item.newHash}
            WHERE id = ${item.id} AND household_id = ${householdId} AND deleted_at IS NULL
              AND name = ${item.name} AND aliases = ${item.aliases}::text[] AND indication = ${item.indication}
          `);
        }
      }
      rows = await this.prisma.$queryRaw(Prisma.sql`
        WITH scoped AS MATERIALIZED (
          SELECT ${fields}, i.semantic_embedding
          FROM household_medicine_inventory i
          WHERE ${visible} AND i.semantic_embedding_model = ${model}
            AND i.semantic_embedding IS NOT NULL
        ), ranked AS MATERIALIZED (
          SELECT id, name, otc, indication, contraindication, "adverseReaction", dosage, quantity, "expireAt",
            1 - (semantic_embedding <=> ${vector}::vector) AS "searchScore" FROM scoped
        ) SELECT * FROM ranked WHERE "searchScore" >= ${threshold}
        ORDER BY "searchScore" DESC, id LIMIT 20
      `);
    }
    return rows.map(row => ({
      id: row.id, name: row.name, otc: row.otc, indication: row.indication,
      contraindication: row.contraindication, adverseReaction: row.adverseReaction, dosage: row.dosage,
      quantity: row.quantity, expireAt: row.expireAt,
      searchScore: input.mode === 'inventory' ? undefined : Number(row.searchScore), searchSource: input.mode === 'name' ? 'exact' : input.mode === 'symptom' ? 'semantic' : 'inventory',
      reference: { source: 'household_cabinet', inventoryId: row.id, label: '家庭药箱', matchType: input.mode === 'name' ? 'exact' : input.mode === 'symptom' ? 'semantic' : 'inventory' },
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
      manufacturer: dto.manufacturer?.trim() || null,
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
      manufacturer: dto.manufacturer?.trim() || null,
    };
  }

}
