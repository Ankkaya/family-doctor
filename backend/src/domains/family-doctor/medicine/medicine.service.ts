import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { BufferedFile } from '@/infrastructure/minio/dto/file.dto';
import { AgentClientService } from '../agent-client/agent-client.service';
import { AgentMedicineBrief, AgentRecognizeMedicineImageOutput } from '../agent-client/agent-client.types';
import { buildDeterministicEmbeddingText, buildSearchText } from '../search/embedding.util';
import { QueryMedicineDto } from './dto/query-medicine.dto';
import { UpsertMedicineDto } from './dto/upsert-medicine.dto';
import { MedicineCatalogItem, RecognizedMedicineItem, UserMedicineCabinetItem } from './medicine.types';

type MedicineCatalogRow = MedicineCatalogItem;
type UserMedicineCabinetRow = UserMedicineCabinetItem;
type CountRow = { count: bigint | number | string };

const SELECT_MEDICINE_COLUMNS = Prisma.sql`
  id,
  name,
  aliases,
  otc::text as otc,
  indication,
  contraindication,
  adverse_reaction as "adverseReaction",
  dosage,
  barcode,
  approval_number as "approvalNumber",
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

const SELECT_USER_CABINET_COLUMNS = Prisma.sql`
  i.id as "inventoryId",
  i.dev_user_id as "devUserId",
  m.id,
  m.id as "medicineId",
  m.name,
  m.aliases,
  m.otc::text as otc,
  m.indication,
  m.contraindication,
  m.adverse_reaction as "adverseReaction",
  m.dosage,
  m.barcode,
  m.approval_number as "approvalNumber",
  m.created_at as "createdAt",
  m.updated_at as "updatedAt",
  i.quantity,
  i.expire_at as "expireAt",
  i.source,
  i.notes,
  i.created_at as "inventoryCreatedAt",
  i.updated_at as "inventoryUpdatedAt"
`;

@Injectable()
export class MedicineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly agentClient: AgentClientService,
  ) {}

  async findCatalog(query: QueryMedicineDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const keyword = query.keyword?.trim();
    const where = this.buildKeywordWhere(keyword);

    const [items, countRows] = await Promise.all([
      this.prisma.$queryRaw<MedicineCatalogRow[]>(Prisma.sql`
        SELECT ${SELECT_MEDICINE_COLUMNS}
        FROM medicine_catalog
        ${where}
        ORDER BY created_at DESC
        LIMIT ${pageSize}
        OFFSET ${skip}
      `),
      this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*) as count
        FROM medicine_catalog
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

  async findOne(id: string) {
    const rows = await this.prisma.$queryRaw<MedicineCatalogRow[]>(Prisma.sql`
      SELECT ${SELECT_MEDICINE_COLUMNS}
      FROM medicine_catalog
      WHERE id = ${id}
      LIMIT 1
    `);

    const item = rows[0];
    if (!item) {
      throw new NotFoundException('药品不存在');
    }

    return this.normalizeRow(item);
  }

  async recognizeFromImages(files: BufferedFile[]): Promise<RecognizedMedicineItem> {
    const recognized = await this.agentClient.recognizeMedicineImages({
      images: files.map((file) => ({
        filename: file.originalname,
        mimeType: file.mimetype,
        dataBase64: file.buffer.toString('base64'),
      })),
    });

    const matchedCatalogItem = await this.findCatalogMatch(recognized);
    return this.normalizeRecognizedMedicine(recognized, matchedCatalogItem);
  }

  async findUserCabinet(query: QueryMedicineDto, devUserId = 'local-dev') {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const keyword = query.keyword?.trim();
    const where = this.buildCabinetWhere(devUserId, keyword);

    const [items, countRows] = await Promise.all([
      this.prisma.$queryRaw<UserMedicineCabinetRow[]>(Prisma.sql`
        SELECT ${SELECT_USER_CABINET_COLUMNS}
        FROM user_medicine_inventory i
        INNER JOIN medicine_catalog m ON m.id = i.medicine_id
        ${where}
        ORDER BY i.updated_at DESC
        LIMIT ${pageSize}
        OFFSET ${skip}
      `),
      this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*) as count
        FROM user_medicine_inventory i
        INNER JOIN medicine_catalog m ON m.id = i.medicine_id
        ${where}
      `),
    ]);

    return {
      items: items.map(this.normalizeCabinetRow),
      total: Number(countRows[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  async findAgentBriefsByDevUser(devUserId = 'local-dev'): Promise<AgentMedicineBrief[]> {
    const rows = await this.prisma.$queryRaw<MedicineCatalogRow[]>(Prisma.sql`
      SELECT ${Prisma.sql`
        m.id,
        m.name,
        m.aliases,
        m.otc::text as otc,
        m.indication,
        m.contraindication,
        m.adverse_reaction as "adverseReaction",
        m.dosage,
        m.barcode,
        m.approval_number as "approvalNumber",
        m.created_at as "createdAt",
        m.updated_at as "updatedAt"
      `}
      FROM user_medicine_inventory i
      INNER JOIN medicine_catalog m ON m.id = i.medicine_id
      WHERE i.dev_user_id = ${devUserId}
      ORDER BY m.name ASC
      LIMIT 500
    `);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      otc: row.otc,
      indication: row.indication,
      contraindication: row.contraindication,
      adverseReaction: row.adverseReaction,
    }));
  }

  async create(dto: UpsertMedicineDto) {
    const id = randomUUID();
    const data = this.normalizeDto(dto);
    const embedding = this.buildMedicineEmbedding(data);
    const rows = await this.prisma.$queryRaw<MedicineCatalogRow[]>(Prisma.sql`
      INSERT INTO medicine_catalog (
        id,
        name,
        aliases,
        otc,
        indication,
        contraindication,
        adverse_reaction,
        dosage,
        barcode,
        approval_number,
        embedding
      )
      VALUES (
        ${id},
        ${data.name},
        ${data.aliases},
        ${data.otc}::"OtcType",
        ${data.indication},
        ${data.contraindication},
        ${data.adverseReaction},
        ${data.dosage},
        ${data.barcode},
        ${data.approvalNumber},
        ${embedding}::vector
      )
      RETURNING ${SELECT_MEDICINE_COLUMNS}
    `);

    return this.normalizeRow(rows[0]);
  }

  async update(id: string, dto: UpsertMedicineDto) {
    await this.findOne(id);
    const data = this.normalizeDto(dto);
    const embedding = this.buildMedicineEmbedding(data);
    const rows = await this.prisma.$queryRaw<MedicineCatalogRow[]>(Prisma.sql`
      UPDATE medicine_catalog
      SET
        name = ${data.name},
        aliases = ${data.aliases},
        otc = ${data.otc}::"OtcType",
        indication = ${data.indication},
        contraindication = ${data.contraindication},
        adverse_reaction = ${data.adverseReaction},
        dosage = ${data.dosage},
        barcode = ${data.barcode},
        approval_number = ${data.approvalNumber},
        embedding = ${embedding}::vector,
        updated_at = now()
      WHERE id = ${id}
      RETURNING ${SELECT_MEDICINE_COLUMNS}
    `);

    return this.normalizeRow(rows[0]);
  }

  async remove(id: string) {
    const rows = await this.prisma.$queryRaw<MedicineCatalogRow[]>(Prisma.sql`
      DELETE FROM medicine_catalog
      WHERE id = ${id}
      RETURNING ${SELECT_MEDICINE_COLUMNS}
    `);

    const item = rows[0];
    if (!item) {
      throw new NotFoundException('药品不存在');
    }

    return this.normalizeRow(item);
  }

  private buildKeywordWhere(keyword?: string) {
    if (!keyword) {
      return Prisma.empty;
    }

    const like = `%${keyword}%`;
    return Prisma.sql`
      WHERE (
        name ILIKE ${like}
        OR indication ILIKE ${like}
        OR EXISTS (
          SELECT 1
          FROM unnest(aliases) alias
          WHERE alias ILIKE ${like}
        )
      )
    `;
  }

  private buildCabinetWhere(devUserId: string, keyword?: string) {
    if (!keyword) {
      return Prisma.sql`WHERE i.dev_user_id = ${devUserId}`;
    }

    const like = `%${keyword}%`;
    return Prisma.sql`
      WHERE i.dev_user_id = ${devUserId}
      AND (
        m.name ILIKE ${like}
        OR m.indication ILIKE ${like}
        OR EXISTS (
          SELECT 1
          FROM unnest(m.aliases) alias
          WHERE alias ILIKE ${like}
        )
      )
    `;
  }

  private normalizeDto(dto: UpsertMedicineDto) {
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

  private normalizeRow(row: MedicineCatalogRow): MedicineCatalogItem {
    return {
      ...row,
      aliases: row.aliases ?? [],
    };
  }

  private normalizeCabinetRow(row: UserMedicineCabinetRow): UserMedicineCabinetItem {
    return {
      ...row,
      aliases: row.aliases ?? [],
    };
  }

  private async findCatalogMatch(recognized: AgentRecognizeMedicineImageOutput) {
    if (recognized.barcode?.trim()) {
      const rows = await this.prisma.$queryRaw<MedicineCatalogRow[]>(Prisma.sql`
        SELECT ${SELECT_MEDICINE_COLUMNS}
        FROM medicine_catalog
        WHERE barcode = ${recognized.barcode.trim()}
        LIMIT 1
      `);
      if (rows[0]) return this.normalizeRow(rows[0]);
    }

    if (recognized.approvalNumber?.trim()) {
      const rows = await this.prisma.$queryRaw<MedicineCatalogRow[]>(Prisma.sql`
        SELECT ${SELECT_MEDICINE_COLUMNS}
        FROM medicine_catalog
        WHERE approval_number = ${recognized.approvalNumber.trim()}
        LIMIT 1
      `);
      if (rows[0]) return this.normalizeRow(rows[0]);
    }

    if (recognized.name?.trim()) {
      const like = `%${recognized.name.trim()}%`;
      const rows = await this.prisma.$queryRaw<MedicineCatalogRow[]>(Prisma.sql`
        SELECT ${SELECT_MEDICINE_COLUMNS}
        FROM medicine_catalog
        WHERE name ILIKE ${like}
        ORDER BY updated_at DESC
        LIMIT 1
      `);
      if (rows[0]) return this.normalizeRow(rows[0]);
    }

    return null;
  }

  private normalizeRecognizedMedicine(
    recognized: AgentRecognizeMedicineImageOutput,
    matchedCatalogItem: MedicineCatalogItem | null,
  ): RecognizedMedicineItem {
    return {
      name: recognized.name?.trim() || matchedCatalogItem?.name || '未识别药品名称',
      aliases: recognized.aliases?.map((item) => item.trim()).filter(Boolean) || matchedCatalogItem?.aliases || [],
      otc: recognized.otc || matchedCatalogItem?.otc || 'OTC',
      indication: recognized.indication?.trim() || matchedCatalogItem?.indication || null,
      contraindication: recognized.contraindication?.trim() || matchedCatalogItem?.contraindication || null,
      adverseReaction: recognized.adverseReaction?.trim() || matchedCatalogItem?.adverseReaction || null,
      dosage: recognized.dosage?.trim() || matchedCatalogItem?.dosage || null,
      barcode: recognized.barcode?.trim() || matchedCatalogItem?.barcode || null,
      approvalNumber: recognized.approvalNumber?.trim() || matchedCatalogItem?.approvalNumber || null,
      manufacturer: recognized.manufacturer?.trim() || null,
      expireAt: this.normalizeExpireAt(recognized.expireAt),
      confidence: typeof recognized.confidence === 'number' ? recognized.confidence : null,
      rawText: recognized.rawText?.trim() || null,
      warnings: recognized.warnings?.map((item) => item.trim()).filter(Boolean) || [],
    };
  }

  private normalizeExpireAt(value?: string | null) {
    if (!value) return null;
    const normalized = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      return normalized;
    }
    if (/^\d{4}[./年-]\d{1,2}[./月-]\d{1,2}日?$/.test(normalized)) {
      return normalized
        .replace(/年|\./g, '-')
        .replace(/月/g, '-')
        .replace(/日/g, '')
        .replace(/\//g, '-')
        .split('-')
        .map((segment, index) => (index === 0 ? segment : segment.padStart(2, '0')))
        .join('-');
    }
    return normalized;
  }

  private buildMedicineEmbedding(input: {
    name?: string | null;
    aliases?: string[] | null;
    indication?: string | null;
    contraindication?: string | null;
    adverseReaction?: string | null;
    dosage?: string | null;
  }) {
    const text = buildSearchText(input);
    return text ? buildDeterministicEmbeddingText(text) : null;
  }
}
