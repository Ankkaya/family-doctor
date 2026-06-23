import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { CreateCronJobDto } from './dto/create-cron-job.dto';
import { CreateCronJobExecutionDto } from './dto/create-cron-job-execution.dto';
import { QueryCronJobsDto } from './dto/query-cron-jobs.dto';

type CronJobRow = {
  id: string;
  userId: string | null;
  householdId: string;
  memberId: string | null;
  type: 'cron' | 'every' | 'at';
  taskType: 'medicine' | 'temperature' | 'cabinet';
  title: string;
  status: 'enabled' | 'disabled' | 'expired';
  cronExpression: string | null;
  everySeconds: number | null;
  runAt: Date | string | null;
  timezone: string;
  payload: Record<string, unknown>;
  source: 'user_agent' | 'system';
  idempotencyKey: string | null;
  nextRunAt: Date | string | null;
  lastRunAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt: Date | string | null;
};

type CronJobExecutionRow = {
  id: string;
  jobId: string;
  status: 'success' | 'failed' | 'skipped';
  startedAt: Date | string;
  finishedAt: Date | string | null;
  result: Record<string, unknown> | null;
  errorMessage: string | null;
  dedupeKey: string | null;
};

type ExpiredMedicineRow = {
  householdId: string;
  inventoryId: string;
  medicineId: string;
  name: string;
  quantity: number;
  expireAt: Date | string;
};

type CountRow = { count: bigint | number | string };

const SELECT_JOB_COLUMNS = Prisma.sql`
  id,
  user_id as "userId",
  household_id as "householdId",
  member_id as "memberId",
  type,
  task_type as "taskType",
  title,
  status,
  cron_expression as "cronExpression",
  every_seconds as "everySeconds",
  run_at as "runAt",
  timezone,
  payload,
  source,
  idempotency_key as "idempotencyKey",
  next_run_at as "nextRunAt",
  last_run_at as "lastRunAt",
  created_at as "createdAt",
  updated_at as "updatedAt",
  deleted_at as "deletedAt"
`;

@Injectable()
export class RemindersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCronJobDto) {
    if (dto.idempotencyKey) {
      const existing = await this.findByIdempotencyKey(dto.idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    const id = randomUUID();
    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO cron_job (
        id,
        user_id,
        household_id,
        member_id,
        type,
        task_type,
        title,
        status,
        cron_expression,
        every_seconds,
        run_at,
        timezone,
        payload,
        source,
        idempotency_key,
        next_run_at
      )
      VALUES (
        ${id},
        ${dto.userId ?? null},
        ${dto.householdId},
        ${dto.memberId ?? null},
        ${dto.type},
        ${dto.taskType},
        ${dto.title.trim()},
        ${dto.status ?? 'enabled'},
        ${dto.cronExpression ?? null},
        ${dto.everySeconds ?? null},
        ${dto.runAt ?? null}::timestamp,
        ${dto.timezone ?? 'Asia/Shanghai'},
        ${JSON.stringify(dto.payload ?? {})}::jsonb,
        ${dto.source ?? 'user_agent'},
        ${dto.idempotencyKey ?? null},
        ${dto.nextRunAt ?? dto.runAt ?? null}::timestamp
      )
    `);

    return this.findById(id);
  }

  async findForApp(query: QueryCronJobsDto, householdId: string) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const result = await this.findMany({ ...query, page, pageSize, householdId });
    const systemTask = this.buildSystemExpiryCheckTask(householdId);
    return {
      ...result,
      items: page === 1 ? [systemTask, ...result.items] : result.items,
      total: result.total + (page === 1 ? 1 : 0),
    };
  }

  async findMany(query: QueryCronJobsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const skip = (page - 1) * pageSize;
    const where = this.buildJobWhere(query);

    const [items, countRows] = await Promise.all([
      this.prisma.$queryRaw<CronJobRow[]>(Prisma.sql`
        SELECT ${SELECT_JOB_COLUMNS}
        FROM cron_job
        ${where}
        ORDER BY created_at DESC
        LIMIT ${pageSize}
        OFFSET ${skip}
      `),
      this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*) as count
        FROM cron_job
        ${where}
      `),
    ]);

    return {
      items: items.map((item) => this.normalizeJob(item)),
      total: Number(countRows[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  async findDueJobs(now = new Date().toISOString()) {
    const rows = await this.prisma.$queryRaw<CronJobRow[]>(Prisma.sql`
      SELECT ${SELECT_JOB_COLUMNS}
      FROM cron_job
      WHERE deleted_at IS NULL
        AND status = 'enabled'
        AND next_run_at IS NOT NULL
        AND next_run_at <= ${now}::timestamp
      ORDER BY next_run_at ASC
      LIMIT 100
    `);

    return rows.map((item) => this.normalizeJob(item));
  }

  async updateStatus(jobId: string, householdId: string | null, status: 'enabled' | 'disabled' | 'expired') {
    const householdFilter = householdId ? Prisma.sql`AND household_id = ${householdId}` : Prisma.empty;
    const affected = await this.prisma.$executeRaw(Prisma.sql`
      UPDATE cron_job
      SET status = ${status},
          updated_at = now()
      WHERE id = ${jobId}
        ${householdFilter}
        AND deleted_at IS NULL
    `);

    if (Number(affected) === 0) {
      throw new NotFoundException('定时任务不存在');
    }

    return this.findById(jobId);
  }

  async updateSchedule(jobId: string, input: { status?: 'enabled' | 'disabled' | 'expired'; nextRunAt?: string | null }) {
    const rows = await this.prisma.$queryRaw<CronJobRow[]>(Prisma.sql`
      UPDATE cron_job
      SET status = COALESCE(${input.status ?? null}, status),
          next_run_at = ${input.nextRunAt ?? null}::timestamp,
          updated_at = now()
      WHERE id = ${jobId}
        AND deleted_at IS NULL
      RETURNING ${SELECT_JOB_COLUMNS}
    `);

    const row = rows[0];
    if (!row) {
      throw new NotFoundException('定时任务不存在');
    }
    return this.normalizeJob(row);
  }

  async remove(jobId: string, householdId: string | null) {
    const householdFilter = householdId ? Prisma.sql`AND household_id = ${householdId}` : Prisma.empty;
    const affected = await this.prisma.$executeRaw(Prisma.sql`
      UPDATE cron_job
      SET deleted_at = now(),
          updated_at = now()
      WHERE id = ${jobId}
        ${householdFilter}
        AND deleted_at IS NULL
    `);

    if (Number(affected) === 0) {
      throw new NotFoundException('定时任务不存在');
    }

    return { success: true };
  }

  async createExecution(jobId: string, dto: CreateCronJobExecutionDto) {
    if (dto.dedupeKey) {
      const existing = await this.findExecutionByDedupeKey(dto.dedupeKey);
      if (existing) {
        return existing;
      }
    }

    const id = randomUUID();
    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO cron_job_execution (
        id,
        job_id,
        status,
        started_at,
        finished_at,
        result,
        error_message,
        dedupe_key
      )
      VALUES (
        ${id},
        ${jobId},
        ${dto.status},
        ${dto.startedAt ?? new Date().toISOString()}::timestamp,
        ${dto.finishedAt ?? null}::timestamp,
        ${dto.result ? JSON.stringify(dto.result) : null}::jsonb,
        ${dto.errorMessage ?? null},
        ${dto.dedupeKey ?? null}
      )
    `);

    if (dto.status === 'success') {
      await this.prisma.$executeRaw(Prisma.sql`
        UPDATE cron_job
        SET last_run_at = now(),
            updated_at = now()
        WHERE id = ${jobId}
      `);
    }

    return this.findExecutionById(id);
  }

  async findExecutions(jobId: string, householdId: string | null) {
    if (householdId) {
      await this.assertJobInHousehold(jobId, householdId);
    }

    const rows = await this.prisma.$queryRaw<CronJobExecutionRow[]>(Prisma.sql`
      SELECT
        id,
        job_id as "jobId",
        status,
        started_at as "startedAt",
        finished_at as "finishedAt",
        result,
        error_message as "errorMessage",
        dedupe_key as "dedupeKey"
      FROM cron_job_execution
      WHERE job_id = ${jobId}
      ORDER BY started_at DESC
      LIMIT 50
    `);

    return rows;
  }

  async findExpiredMedicines(householdId?: string) {
    const householdFilter = householdId ? Prisma.sql`AND household_id = ${householdId}` : Prisma.empty;
    return this.prisma.$queryRaw<ExpiredMedicineRow[]>(Prisma.sql`
      SELECT
        household_id as "householdId",
        id as "inventoryId",
        id as "medicineId",
        name,
        quantity,
        expire_at as "expireAt"
      FROM household_medicine_inventory
      WHERE deleted_at IS NULL
        AND quantity > 0
        AND expire_at IS NOT NULL
        AND expire_at < CURRENT_DATE
        ${householdFilter}
      ORDER BY expire_at ASC
      LIMIT 500
    `);
  }

  private async findById(jobId: string) {
    const rows = await this.prisma.$queryRaw<CronJobRow[]>(Prisma.sql`
      SELECT ${SELECT_JOB_COLUMNS}
      FROM cron_job
      WHERE id = ${jobId}
        AND deleted_at IS NULL
      LIMIT 1
    `);
    const row = rows[0];
    if (!row) {
      throw new NotFoundException('定时任务不存在');
    }
    return this.normalizeJob(row);
  }

  private async findByIdempotencyKey(idempotencyKey: string) {
    const rows = await this.prisma.$queryRaw<CronJobRow[]>(Prisma.sql`
      SELECT ${SELECT_JOB_COLUMNS}
      FROM cron_job
      WHERE idempotency_key = ${idempotencyKey}
        AND deleted_at IS NULL
      LIMIT 1
    `);
    return rows[0] ? this.normalizeJob(rows[0]) : null;
  }

  private async findExecutionById(id: string) {
    const rows = await this.prisma.$queryRaw<CronJobExecutionRow[]>(Prisma.sql`
      SELECT
        id,
        job_id as "jobId",
        status,
        started_at as "startedAt",
        finished_at as "finishedAt",
        result,
        error_message as "errorMessage",
        dedupe_key as "dedupeKey"
      FROM cron_job_execution
      WHERE id = ${id}
      LIMIT 1
    `);
    return rows[0];
  }

  private async findExecutionByDedupeKey(dedupeKey: string) {
    const rows = await this.prisma.$queryRaw<CronJobExecutionRow[]>(Prisma.sql`
      SELECT
        id,
        job_id as "jobId",
        status,
        started_at as "startedAt",
        finished_at as "finishedAt",
        result,
        error_message as "errorMessage",
        dedupe_key as "dedupeKey"
      FROM cron_job_execution
      WHERE dedupe_key = ${dedupeKey}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  private async assertJobInHousehold(jobId: string, householdId: string) {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id
      FROM cron_job
      WHERE id = ${jobId}
        AND household_id = ${householdId}
        AND deleted_at IS NULL
      LIMIT 1
    `);
    if (!rows[0]) {
      throw new NotFoundException('定时任务不存在');
    }
  }

  private buildJobWhere(query: QueryCronJobsDto) {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`deleted_at IS NULL`,
    ];

    if (query.householdId?.trim()) {
      conditions.push(Prisma.sql`household_id = ${query.householdId.trim()}`);
    }
    if (query.userId?.trim()) {
      conditions.push(Prisma.sql`user_id = ${query.userId.trim()}`);
    }
    if (query.status) {
      conditions.push(Prisma.sql`status = ${query.status}`);
    }
    if (query.taskType) {
      conditions.push(Prisma.sql`task_type = ${query.taskType}`);
    }

    return Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
  }

  private normalizeJob(row: CronJobRow) {
    return {
      ...row,
      payload: row.payload ?? {},
      virtual: false,
    };
  }

  private buildSystemExpiryCheckTask(householdId: string) {
    return {
      id: `system-expiry-check:${householdId}`,
      userId: null,
      householdId,
      memberId: null,
      type: 'cron',
      taskType: 'cabinet',
      title: '药品过期检查',
      status: 'enabled',
      cronExpression: '0 9 * * *',
      everySeconds: null,
      runAt: null,
      timezone: 'Asia/Shanghai',
      payload: {
        taskType: 'cabinet',
        systemTask: 'expired_medicine_check',
      },
      source: 'system',
      idempotencyKey: null,
      nextRunAt: null,
      lastRunAt: null,
      createdAt: null,
      updatedAt: null,
      deletedAt: null,
      virtual: true,
    };
  }
}
