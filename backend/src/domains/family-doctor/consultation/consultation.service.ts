import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { AgentClientService } from '../agent-client/agent-client.service';
import { AgentTraceStep, AgentUserProfile } from '../agent-client/agent-client.types';
import { CabinetService } from '../cabinet/cabinet.service';
import { CurrentHousehold } from '@/domains/households/households.service';
import { AskConsultationDto } from './dto/ask-consultation.dto';
import { QueryConsultationDto } from './dto/query-consultation.dto';

type SessionRow = {
  id: string;
  userId: string | null;
  householdId: string | null;
  devUserId: string | null;
  householdName?: string | null;
  userNickname?: string | null;
  userPhone?: string | null;
  title: string | null;
  createdAt: Date | string;
  messageCount?: number;
};

type SessionAccessRow = {
  id: string;
  userId: string | null;
  householdId: string | null;
  deletedAt: Date | string | null;
};

type MessageRow = {
  id: string;
  sessionId: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  recommends: unknown | null;
  createdAt: Date | string;
};

type TraceRow = {
  id: string;
  sessionId: string | null;
  nodeName: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  llmModel: string | null;
  tokenIn: number | null;
  tokenOut: number | null;
  latencyMs: number;
  error: string | null;
  createdAt: Date | string;
};

type CountRow = { count: bigint | number | string };

@Injectable()
export class ConsultationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cabinetService: CabinetService,
    private readonly agentClient: AgentClientService,
  ) {}

  async ask(dto: AskConsultationDto, current: CurrentHousehold) {
    const question = dto.question.trim();
    const sessionId = dto.sessionId?.trim() || randomUUID();
    const assistantMessageId = randomUUID();
    const title = this.buildSessionTitle(question);

    if (dto.sessionId?.trim()) {
      await this.assertSessionAccess(sessionId, current);
    }

    await this.ensureSession(sessionId, title, current);
    await this.createMessage({
      id: randomUUID(),
      sessionId,
      role: 'USER',
      content: question,
      recommends: null,
    });

    const [medicines, userProfile] = await Promise.all([
      this.cabinetService.findAgentBriefsByHousehold(current.householdId, question),
      this.findAgentUserProfile(current.appUserId),
    ]);
    const agentResponse = await this.agentClient.consult({
      sessionId,
      question,
      medicines,
      userProfile,
      allowRxRecommendation: dto.allowRxRecommendation === true,
    });

    await this.createMessage({
      id: assistantMessageId,
      sessionId,
      role: 'ASSISTANT',
      content: agentResponse.answer,
      recommends: agentResponse.recommends,
    });
    await this.createTraces(sessionId, agentResponse.traces ?? []);

    return {
      sessionId,
      messageId: assistantMessageId,
      answer: agentResponse.answer,
      recommends: agentResponse.recommends,
      disclaimer: agentResponse.disclaimer,
    };
  }

  async findSessions(query: QueryConsultationDto) {
    return this.findSessionsInternal(query);
  }

  async findUserSessions(query: QueryConsultationDto, current: CurrentHousehold) {
    return this.findSessionsInternal(query, { householdId: current.householdId });
  }

  async findUserSession(id: string, current: CurrentHousehold) {
    return this.findSessionInternal(id, { householdId: current.householdId, includeTraces: false });
  }

  async findSession(id: string) {
    return this.findSessionInternal(id, { includeTraces: true });
  }

  async removeAdmin(id: string) {
    const affected = await this.prisma.$executeRaw(Prisma.sql`
      UPDATE consultation_session
      SET deleted_at = now()
      WHERE id = ${id}
        AND deleted_at IS NULL
    `);

    if (Number(affected) === 0) {
      throw new NotFoundException('问诊会话不存在');
    }

    return { success: true };
  }

  private async findSessionsInternal(
    query: QueryConsultationDto,
    scope: { householdId?: string; userId?: string } = {},
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const where = this.buildSessionWhere({
      keyword: query.keyword?.trim(),
      householdId: scope.householdId ?? query.householdId?.trim(),
      userId: scope.userId ?? query.userId?.trim(),
    });

    const [items, countRows] = await Promise.all([
      this.prisma.$queryRaw<SessionRow[]>(Prisma.sql`
        SELECT
          s.id,
          s.user_id as "userId",
          s.household_id as "householdId",
          s.dev_user_id as "devUserId",
          h.name as "householdName",
          u.nickname as "userNickname",
          u.phone as "userPhone",
          s.title,
          s.created_at as "createdAt",
          COUNT(m.id)::int as "messageCount"
        FROM consultation_session s
        LEFT JOIN consultation_message m ON m.session_id = s.id
        LEFT JOIN household h ON h.id = s.household_id
        LEFT JOIN app_user u ON u.id = s.user_id
        ${where}
        GROUP BY s.id
          , h.name
          , u.nickname
          , u.phone
        ORDER BY s.created_at DESC
        LIMIT ${pageSize}
        OFFSET ${skip}
      `),
      this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*) as count
        FROM consultation_session s
        LEFT JOIN household h ON h.id = s.household_id
        LEFT JOIN app_user u ON u.id = s.user_id
        ${where}
      `),
    ]);

    return {
      items,
      total: Number(countRows[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  private async findSessionInternal(
    id: string,
    options: { householdId?: string; includeTraces?: boolean } = {},
  ) {
    const householdFilter = options.householdId
      ? Prisma.sql`AND s.household_id = ${options.householdId}`
      : Prisma.empty;
    const sessions = await this.prisma.$queryRaw<SessionRow[]>(Prisma.sql`
      SELECT
        s.id,
        s.user_id as "userId",
        s.household_id as "householdId",
        s.dev_user_id as "devUserId",
        h.name as "householdName",
        u.nickname as "userNickname",
        u.phone as "userPhone",
        s.title,
        s.created_at as "createdAt"
      FROM consultation_session s
      LEFT JOIN household h ON h.id = s.household_id
      LEFT JOIN app_user u ON u.id = s.user_id
      WHERE s.id = ${id}
      AND s.deleted_at IS NULL
      ${householdFilter}
      LIMIT 1
    `);

    const session = sessions[0];
    if (!session) {
      throw new NotFoundException('问诊会话不存在');
    }

    const [messages, traces] = await Promise.all([
      this.prisma.$queryRaw<MessageRow[]>(Prisma.sql`
        SELECT
          id,
          session_id as "sessionId",
          role::text as role,
          content,
          recommends,
          created_at as "createdAt"
        FROM consultation_message
        WHERE session_id = ${id}
        ORDER BY created_at ASC
      `),
      options.includeTraces
        ? this.prisma.$queryRaw<TraceRow[]>(Prisma.sql`
        SELECT
          id,
          session_id as "sessionId",
          node_name as "nodeName",
          input,
          output,
          llm_model as "llmModel",
          token_in as "tokenIn",
          token_out as "tokenOut",
          latency_ms as "latencyMs",
          error,
          created_at as "createdAt"
        FROM agent_trace
        WHERE session_id = ${id}
        ORDER BY created_at ASC
      `)
        : Promise.resolve([]),
    ]);

    const result = {
      ...session,
      messages,
    };

    return options.includeTraces ? { ...result, traces } : result;
  }

  private async assertSessionAccess(sessionId: string, current: CurrentHousehold) {
    const sessions = await this.prisma.$queryRaw<SessionAccessRow[]>(Prisma.sql`
      SELECT
        id,
        user_id as "userId",
        household_id as "householdId",
        deleted_at as "deletedAt"
      FROM consultation_session
      WHERE id = ${sessionId}
      LIMIT 1
    `);

    const session = sessions[0];
    if (!session) {
      return;
    }

    if (session.deletedAt) {
      throw new NotFoundException('问诊会话不存在');
    }

    if (session.householdId !== current.householdId) {
      throw new ForbiddenException('无权继续该问诊会话');
    }
  }

  private async ensureSession(sessionId: string, title: string, current: CurrentHousehold) {
    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO consultation_session (id, user_id, household_id, dev_user_id, title)
      VALUES (${sessionId}, ${current.appUserId}, ${current.householdId}, NULL, ${title})
      ON CONFLICT (id) DO NOTHING
    `);
  }

  private async createMessage(input: {
    id: string;
    sessionId: string;
    role: 'USER' | 'ASSISTANT';
    content: string;
    recommends: unknown | null;
  }) {
    const recommendsJson = input.recommends ? JSON.stringify(input.recommends) : null;

    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO consultation_message (id, session_id, role, content, recommends)
      VALUES (
        ${input.id},
        ${input.sessionId},
        ${input.role}::"MsgRole",
        ${input.content},
        ${recommendsJson}::jsonb
      )
    `);
  }

  private async createTraces(sessionId: string, traces: AgentTraceStep[]) {
    for (const trace of traces) {
      await this.prisma.$executeRaw(Prisma.sql`
        INSERT INTO agent_trace (
          id,
          session_id,
          node_name,
          input,
          output,
          llm_model,
          token_in,
          token_out,
          latency_ms,
          error
        )
        VALUES (
          ${randomUUID()},
          ${sessionId},
          ${trace.nodeName},
          ${JSON.stringify(trace.input ?? {})}::jsonb,
          ${JSON.stringify(trace.output ?? {})}::jsonb,
          ${trace.llmModel ?? null},
          ${trace.tokenIn ?? null},
          ${trace.tokenOut ?? null},
          ${trace.latencyMs ?? 0},
          ${trace.error ?? null}
        )
      `);
    }
  }

  private async findAgentUserProfile(appUserId: string): Promise<AgentUserProfile | null> {
    const user = await this.prisma.appUser.findFirst({
      where: {
        id: appUserId,
        deletedAt: null,
      },
      select: {
        age: true,
        gender: true,
        allergies: true,
        chronicDiseases: true,
        medicationHistory: true,
      },
    });

    return user;
  }

  private buildSessionWhere(input: { keyword?: string; householdId?: string; userId?: string }) {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`s.deleted_at IS NULL`,
    ];

    if (input.householdId) {
      conditions.push(Prisma.sql`s.household_id = ${input.householdId}`);
    }
    if (input.userId) {
      conditions.push(Prisma.sql`s.user_id = ${input.userId}`);
    }
    if (input.keyword) {
      const like = `%${input.keyword}%`;
      conditions.push(Prisma.sql`(
        s.id ILIKE ${like}
        OR s.title ILIKE ${like}
        OR h.name ILIKE ${like}
        OR u.nickname ILIKE ${like}
        OR u.phone ILIKE ${like}
      )`);
    }

    return Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
  }

  private buildSessionTitle(question: string) {
    const title = question.replace(/\s+/g, ' ').trim();
    return title.length > 24 ? `${title.slice(0, 24)}...` : title;
  }
}
