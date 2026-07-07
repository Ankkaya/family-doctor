import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { AgentClientService } from '../agent-client/agent-client.service';
import {
  AgentHistoryMessage,
  AgentSessionSummary,
  AgentTraceStep,
  AgentUserProfile,
  AgentRecommend,
} from '../agent-client/agent-client.types';
import { CabinetService } from '../cabinet/cabinet.service';
import { CurrentHousehold, HouseholdsService } from '@/domains/households/households.service';
import { AskConsultationDto } from './dto/ask-consultation.dto';
import { QueryConsultationDto } from './dto/query-consultation.dto';
import { RunConsultationDebugDto } from './dto/run-consultation-debug.dto';
import {
  getConsultationNodeSpec,
  getConsultationPromptByNode,
  getConsultationPromptCatalog,
  type ConsultationNodeSpec,
} from './consultation-debug';

type SessionRow = {
  id: string;
  userId: string | null;
  householdId: string | null;
  devUserId: string | null;
  householdName?: string | null;
  userNickname?: string | null;
  userPhone?: string | null;
  title: string | null;
  summary?: unknown | null;
  summaryUpdatedAt?: Date | string | null;
  status?: ConsultationSessionStatus | string | null;
  createdAt: Date | string;
  messageCount?: number;
};

type SessionAccessRow = {
  id: string;
  userId: string | null;
  householdId: string | null;
  status?: ConsultationSessionStatus | string | null;
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

type PromptRuntimeInfo = {
  key: string;
  version: string;
  sourceFile: string;
  expectation: string | null;
  systemPrompt: string | null;
  userPrompt: string | null;
};

type TraceDetailRow = TraceRow & {
  spec: ConsultationNodeSpec;
  prompt: PromptRuntimeInfo | null;
};

type ConsultationTurn = {
  turnIndex: number;
  startedAt: string;
  completedAt: string | null;
  userMessage: MessageRow | null;
  assistantMessage: MessageRow | null;
  traces: TraceDetailRow[];
};

type CountRow = { count: bigint | number | string };

type ConsultationStreamStage = 'prepare' | 'lookup' | 'agent' | 'fallback' | 'finalize';
type ConsultationSessionStatus = 'active' | 'resolved' | 'stale' | 'closed';

type SessionMemoryContext = {
  historyMessages: AgentHistoryMessage[];
  sessionSummary: AgentSessionSummary | null;
  status: ConsultationSessionStatus;
  allMessages: MessageRow[];
};

type SessionDecision = {
  sessionId: string;
  previousSessionId?: string;
  status: ConsultationSessionStatus;
};

const FULL_HISTORY_MESSAGE_LIMIT = 10;
const RECENT_HISTORY_MESSAGE_LIMIT = 6;
const STALE_SESSION_MS = 2 * 60 * 60 * 1000;

const EMPTY_PROFILE_VALUES = new Set([
  '无',
  '暂无',
  '没有',
  '无无',
  '无过敏史',
  '无基础病',
  '无慢性病',
  '无慢性病史',
  '无长期用药',
  'none',
  'no',
  'n/a',
  'na',
]);

const CONSULTATION_DEBUG_NODE_NAMES = [
  'preprocess',
  'parse',
  'emergency',
  'special_population',
  'match',
  'review',
  'safety',
  'render',
  'summarize',
];

export type ConsultationStreamEvent =
  | {
      type: 'session';
      sessionId: string;
      messageId: string;
    }
  | {
      type: 'status';
      stage: ConsultationStreamStage;
      message: string;
    }
  | {
      type: 'answer_delta';
      delta: string;
    }
  | {
      type: 'complete';
      sessionId: string;
      messageId: string;
      answer: string;
      recommends: AgentRecommend[];
      disclaimer: string;
    };

function normalizeStreamStage(stage?: string): ConsultationStreamStage {
  if (stage === 'prepare' || stage === 'lookup' || stage === 'agent' || stage === 'fallback' || stage === 'finalize') {
    return stage;
  }

  return 'agent';
}

@Injectable()
export class ConsultationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cabinetService: CabinetService,
    private readonly agentClient: AgentClientService,
    private readonly householdsService: HouseholdsService,
  ) {}

  async ask(dto: AskConsultationDto, current: CurrentHousehold) {
    const question = dto.question.trim();
    const decision = await this.resolveSessionForQuestion(dto.sessionId?.trim(), question, current);
    const sessionId = decision.sessionId;
    const assistantMessageId = randomUUID();
    const title = this.buildSessionTitle(question);

    await this.ensureSession(sessionId, title, current);
    await this.createMessage({
      id: randomUUID(),
      sessionId,
      role: 'USER',
      content: question,
      recommends: null,
    });

    const memory = await this.buildAgentMemoryContext(sessionId);
    const medicineLookupQuery = this.buildMedicineLookupQuery(question, memory.sessionSummary);
    const [medicines, userProfile, members, history] = await Promise.all([
      this.cabinetService.findAgentBriefsByHousehold(current.householdId, medicineLookupQuery),
      this.findAgentUserProfile(current.appUserId),
      this.findAgentMembers(current.householdId),
      this.findRecentMessagesForAgent(sessionId),
    ]);
    const agentResponse = await this.agentClient.consult({
      sessionId,
      question,
      userId: current.appUserId,
      householdId: current.householdId,
      medicines,
      members,
      history,
      userProfile,
      historyMessages: memory.historyMessages,
      sessionSummary: memory.sessionSummary,
      conversationStatus: memory.status,
      allowRxRecommendation: dto.allowRxRecommendation === true,
      timezone: 'Asia/Shanghai',
      now: new Date().toISOString(),
    });

    await this.createMessage({
      id: assistantMessageId,
      sessionId,
      role: 'ASSISTANT',
      content: agentResponse.answer,
      recommends: agentResponse.recommends,
    });
    await this.updateSessionMemory(sessionId, agentResponse.sessionSummary, this.deriveNextStatus(agentResponse.sessionSummary, memory.status));
    await this.createTraces(sessionId, agentResponse.traces ?? []);

    return {
      sessionId,
      messageId: assistantMessageId,
      answer: agentResponse.answer,
      recommends: agentResponse.recommends,
      disclaimer: agentResponse.disclaimer,
    };
  }

  async askStream(
    dto: AskConsultationDto,
    current: CurrentHousehold,
    onEvent: (event: ConsultationStreamEvent) => Promise<void> | void,
  ) {
    const question = dto.question.trim();
    const decision = await this.resolveSessionForQuestion(dto.sessionId?.trim(), question, current);
    const sessionId = decision.sessionId;
    const assistantMessageId = randomUUID();
    const title = this.buildSessionTitle(question);

    await this.ensureSession(sessionId, title, current);
    await this.createMessage({
      id: randomUUID(),
      sessionId,
      role: 'USER',
      content: question,
      recommends: null,
    });
    await onEvent({ type: 'session', sessionId, messageId: assistantMessageId });
    await onEvent({ type: 'status', stage: 'lookup', message: '正在整理家庭药箱信息' });

    const memory = await this.buildAgentMemoryContext(sessionId);
    const medicineLookupQuery = this.buildMedicineLookupQuery(question, memory.sessionSummary);
    const [medicines, userProfile, members, history] = await Promise.all([
      this.cabinetService.findAgentBriefsByHousehold(current.householdId, medicineLookupQuery),
      this.findAgentUserProfile(current.appUserId),
      this.findAgentMembers(current.householdId),
      this.findRecentMessagesForAgent(sessionId),
    ]);

    await onEvent({ type: 'status', stage: 'agent', message: '正在生成用药建议' });
    const agentResponse = await this.agentClient.consultStream(
      {
        sessionId,
        question,
        userId: current.appUserId,
        householdId: current.householdId,
        medicines,
        members,
        history,
        userProfile,
        historyMessages: memory.historyMessages,
        sessionSummary: memory.sessionSummary,
        conversationStatus: memory.status,
        allowRxRecommendation: dto.allowRxRecommendation === true,
        timezone: 'Asia/Shanghai',
        now: new Date().toISOString(),
      },
      async (event) => {
        if (event.type === 'status') {
          await onEvent({
            type: 'status',
            stage: normalizeStreamStage(event.stage),
            message: event.message,
          });
          return;
        }

        if (event.type === 'answer_delta') {
          await onEvent({ type: 'answer_delta', delta: event.delta });
        }
      },
    );

    await onEvent({ type: 'status', stage: 'finalize', message: '正在保存问诊记录' });
    await this.createMessage({
      id: assistantMessageId,
      sessionId,
      role: 'ASSISTANT',
      content: agentResponse.answer,
      recommends: agentResponse.recommends,
    });
    await this.updateSessionMemory(sessionId, agentResponse.sessionSummary, this.deriveNextStatus(agentResponse.sessionSummary, memory.status));
    await this.createTraces(sessionId, agentResponse.traces ?? []);

    await onEvent({
      type: 'complete',
      sessionId,
      messageId: assistantMessageId,
      answer: agentResponse.answer,
      recommends: agentResponse.recommends,
      disclaimer: agentResponse.disclaimer,
    });
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

  async findPromptCatalog() {
    return getConsultationPromptCatalog();
  }

  async runDebug(dto: RunConsultationDebugDto) {
    const question = dto.question.trim();
    const debugRunId = randomUUID();
    const createdAt = new Date();

    const sessionSummary = this.normalizeSessionSummary(dto.sessionSummary);
    const [medicines, userProfile] = await Promise.all([
      dto.householdId?.trim()
        ? this.cabinetService.findAgentBriefsByHousehold(dto.householdId.trim(), this.buildMedicineLookupQuery(question, sessionSummary))
        : Promise.resolve([]),
      dto.userId?.trim()
        ? this.findAgentUserProfile(dto.userId.trim())
        : Promise.resolve(null),
    ]);

    const agentResponse = await this.agentClient.consult({
      sessionId: debugRunId,
      question,
      medicines,
      userProfile,
      historyMessages: this.normalizeDebugHistoryMessages(dto.historyMessages),
      sessionSummary,
      conversationStatus: this.normalizeSessionStatus(dto.conversationStatus),
      allowRxRecommendation: dto.allowRxRecommendation === true,
    });

    const traces = (agentResponse.traces ?? []).map((trace, index) => this.buildTraceDetail({
      id: randomUUID(),
      sessionId: debugRunId,
      nodeName: trace.nodeName,
      input: trace.input ?? {},
      output: trace.output ?? {},
      llmModel: trace.llmModel ?? null,
      tokenIn: trace.tokenIn ?? null,
      tokenOut: trace.tokenOut ?? null,
      latencyMs: trace.latencyMs ?? 0,
      error: trace.error ?? null,
      createdAt: new Date(createdAt.getTime() + index),
    }));

    return {
      debugRunId,
      question,
      householdId: dto.householdId?.trim() || null,
      userId: dto.userId?.trim() || null,
      medicineCount: medicines.length,
      userProfile,
      answer: agentResponse.answer,
      recommends: agentResponse.recommends,
      disclaimer: agentResponse.disclaimer,
      sessionSummary: agentResponse.sessionSummary ?? null,
      traces,
      nodeSpecs: CONSULTATION_DEBUG_NODE_NAMES.map(getConsultationNodeSpec),
      promptCatalog: getConsultationPromptCatalog(),
      createdAt: createdAt.toISOString(),
    };
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

  async closeUserSession(id: string, current: CurrentHousehold) {
    await this.assertSessionAccess(id, current);

    const affected = await this.prisma.$executeRaw(Prisma.sql`
      UPDATE consultation_session
      SET status = 'closed'
      WHERE id = ${id}
        AND household_id = ${current.householdId}
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
          s.summary,
          s.summary_updated_at as "summaryUpdatedAt",
          s.status,
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
        s.summary,
        s.summary_updated_at as "summaryUpdatedAt",
        s.status,
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

    const traceDetails = traces.map((trace) => this.buildTraceDetail(trace));
    const turns = this.buildConsultationTurns(messages, traceDetails);
    const result = {
      ...session,
      messages,
      turns,
      promptCatalog: getConsultationPromptCatalog(),
    };

    return options.includeTraces ? { ...result, traces: traceDetails } : result;
  }

  private async assertSessionAccess(sessionId: string, current: CurrentHousehold) {
    const sessions = await this.prisma.$queryRaw<SessionAccessRow[]>(Prisma.sql`
      SELECT
        id,
        user_id as "userId",
        household_id as "householdId",
        status,
        deleted_at as "deletedAt"
      FROM consultation_session
      WHERE id = ${sessionId}
      LIMIT 1
    `);

    const session = sessions[0];
    if (!session) {
      return null;
    }

    if (session.deletedAt) {
      throw new NotFoundException('问诊会话不存在');
    }

    if (session.householdId !== current.householdId) {
      throw new ForbiddenException('无权继续该问诊会话');
    }

    return session;
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

  private async resolveSessionForQuestion(
    requestedSessionId: string | undefined,
    question: string,
    current: CurrentHousehold,
  ): Promise<SessionDecision> {
    if (!requestedSessionId) {
      return { sessionId: randomUUID(), status: 'active' };
    }

    const session = await this.assertSessionAccess(requestedSessionId, current);
    if (!session) {
      return { sessionId: requestedSessionId, status: 'active' };
    }

    const memory = await this.buildAgentMemoryContext(requestedSessionId);
    const status = this.normalizeSessionStatus(session.status ?? memory.status);
    const followUp = this.isLikelyFollowUp(question);
    const stale = this.isSessionStale(memory.allMessages);
    const newTopic = this.isLikelyNewTopic(question, memory.sessionSummary);

    if (status === 'closed' || (status === 'resolved' && !followUp) || (newTopic && !followUp) || (stale && !followUp)) {
      if (stale) {
        await this.updateSessionStatus(requestedSessionId, 'stale');
      }
      return {
        sessionId: randomUUID(),
        previousSessionId: requestedSessionId,
        status: 'active',
      };
    }

    if (stale && status === 'active') {
      await this.updateSessionStatus(requestedSessionId, 'stale');
      return { sessionId: requestedSessionId, status: 'stale' };
    }

    return { sessionId: requestedSessionId, status };
  }

  private async buildAgentMemoryContext(sessionId: string): Promise<SessionMemoryContext> {
    const [sessionRows, messages] = await Promise.all([
      this.prisma.$queryRaw<SessionRow[]>(Prisma.sql`
        SELECT
          id,
          user_id as "userId",
          household_id as "householdId",
          dev_user_id as "devUserId",
          title,
          summary,
          summary_updated_at as "summaryUpdatedAt",
          status,
          created_at as "createdAt"
        FROM consultation_session
        WHERE id = ${sessionId}
          AND deleted_at IS NULL
        LIMIT 1
      `),
      this.prisma.$queryRaw<MessageRow[]>(Prisma.sql`
        SELECT
          id,
          session_id as "sessionId",
          role::text as role,
          content,
          recommends,
          created_at as "createdAt"
        FROM consultation_message
        WHERE session_id = ${sessionId}
        ORDER BY created_at ASC
      `),
    ]);

    const session = sessionRows[0];
    const status = this.normalizeSessionStatus(session?.status);
    const summary = this.normalizeSessionSummary(session?.summary);
    const selectedMessages = messages.length <= FULL_HISTORY_MESSAGE_LIMIT
      ? messages
      : messages.slice(-RECENT_HISTORY_MESSAGE_LIMIT);

    return {
      historyMessages: selectedMessages.map((message) => ({
        role: message.role,
        content: message.content,
        createdAt: this.toIsoString(message.createdAt),
      })),
      sessionSummary: summary,
      status,
      allMessages: messages,
    };
  }

  private async updateSessionMemory(
    sessionId: string,
    summary: AgentSessionSummary | null | undefined,
    status: ConsultationSessionStatus,
  ) {
    const summaryJson = summary ? JSON.stringify(this.normalizeSessionSummary(summary)) : null;

    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE consultation_session
      SET
        summary = COALESCE(${summaryJson}::jsonb, summary),
        summary_updated_at = CASE WHEN ${summaryJson} IS NULL THEN summary_updated_at ELSE now() END,
        status = ${status}
      WHERE id = ${sessionId}
        AND deleted_at IS NULL
    `);
  }

  private async updateSessionStatus(sessionId: string, status: ConsultationSessionStatus) {
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE consultation_session
      SET status = ${status}
      WHERE id = ${sessionId}
        AND deleted_at IS NULL
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

    if (!user) return null;

    return {
      ...user,
      allergies: this.normalizeOptionalProfileText(user.allergies),
      chronicDiseases: this.normalizeOptionalProfileText(user.chronicDiseases),
      medicationHistory: this.normalizeOptionalProfileText(user.medicationHistory),
    };
  }

  private async findAgentMembers(householdId: string) {
    const members = await this.householdsService.listMembers(householdId);
    return members.map((member) => ({
      id: member.id,
      displayName: member.displayName || member.user.nickname || member.user.username || '家庭成员',
      userId: member.user.id,
      role: member.role,
    }));
  }

  private async findRecentMessagesForAgent(sessionId: string) {
    const rows = await this.prisma.$queryRaw<MessageRow[]>(Prisma.sql`
      SELECT
        id,
        session_id as "sessionId",
        role::text as role,
        content,
        recommends,
        created_at as "createdAt"
      FROM consultation_message
      WHERE session_id = ${sessionId}
      ORDER BY created_at DESC
      LIMIT 8
    `);

    return rows.reverse().map((message) => ({
      role: message.role,
      content: message.content,
    }));
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

  private normalizeOptionalProfileText(value?: string | null) {
    const normalized = value?.trim();
    if (!normalized) return null;

    const compact = normalized.replace(/\s+/g, '').toLowerCase();
    return EMPTY_PROFILE_VALUES.has(compact) ? null : normalized;
  }

  private normalizeSessionStatus(value?: string | null): ConsultationSessionStatus {
    if (value === 'resolved' || value === 'stale' || value === 'closed') {
      return value;
    }

    return 'active';
  }

  private normalizeSessionSummary(value?: unknown | null): AgentSessionSummary | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const summary = value as Partial<AgentSessionSummary>;
    return {
      chiefComplaint: this.pickString(summary.chiefComplaint),
      symptoms: this.pickStringList(summary.symptoms),
      duration: this.pickString(summary.duration),
      riskFlags: this.pickStringList(summary.riskFlags),
      mentionedMedicines: this.pickStringList(summary.mentionedMedicines),
      rejectedMedicines: this.pickStringList(summary.rejectedMedicines),
      recommendedMedicines: this.pickStringList(summary.recommendedMedicines),
      temporaryUserFacts: this.pickStringList(summary.temporaryUserFacts),
      unresolvedQuestions: this.pickStringList(summary.unresolvedQuestions),
      lastTopic: this.pickString(summary.lastTopic),
      suggestedStatus: this.normalizeSessionStatus(summary.suggestedStatus),
    };
  }

  private normalizeDebugHistoryMessages(value?: unknown): AgentHistoryMessage[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return null;
        }
        const message = item as Partial<AgentHistoryMessage>;
        const role = message.role === 'ASSISTANT' ? 'ASSISTANT' : 'USER';
        const content = this.pickString(message.content);
        if (!content) {
          return null;
        }
        return {
          role,
          content,
          createdAt: this.pickString(message.createdAt) ?? new Date().toISOString(),
        };
      })
      .filter((item): item is AgentHistoryMessage => item !== null)
      .slice(-RECENT_HISTORY_MESSAGE_LIMIT);
  }

  private deriveNextStatus(
    summary: AgentSessionSummary | null | undefined,
    fallback: ConsultationSessionStatus,
  ): ConsultationSessionStatus {
    if (fallback === 'closed') {
      return 'closed';
    }

    if (!summary?.suggestedStatus) {
      return fallback === 'stale' ? 'active' : fallback;
    }

    const nextStatus = this.normalizeSessionStatus(summary.suggestedStatus);
    return nextStatus === 'closed' ? 'resolved' : nextStatus;
  }

  private buildMedicineLookupQuery(question: string, summary: AgentSessionSummary | null) {
    const parts = [
      question,
      summary?.chiefComplaint,
      summary?.lastTopic,
      ...(summary?.symptoms ?? []),
      ...(summary?.mentionedMedicines ?? []),
    ];
    return parts.filter((item): item is string => Boolean(item?.trim())).join(' ').slice(0, 240);
  }

  private isSessionStale(messages: MessageRow[]) {
    const latest = messages[messages.length - 1];
    if (!latest) {
      return false;
    }

    return Date.now() - this.toTimestamp(latest.createdAt) > STALE_SESSION_MS;
  }

  private isLikelyFollowUp(question: string) {
    const compact = question.replace(/\s+/g, '');
    return /这个|那个|这药|该药|刚才|上面|前面|继续|还能|还可以|能不能|怎么吃|饭前|饭后|多久|剂量|用量|它|副作用|禁忌|可以吃吗/.test(compact);
  }

  private isLikelyNewTopic(question: string, summary: AgentSessionSummary | null) {
    const compact = question.replace(/\s+/g, '');
    if (/另外|换个问题|另一个问题|我妈|我爸|孩子|小孩|老人|家人/.test(compact)) {
      return true;
    }

    const previousSymptoms = new Set(summary?.symptoms ?? []);
    if (previousSymptoms.size === 0) {
      return false;
    }

    const currentSymptoms = this.extractSymptomHints(compact);
    if (currentSymptoms.length === 0) {
      return false;
    }

    return currentSymptoms.every((symptom) => !previousSymptoms.has(symptom));
  }

  private extractSymptomHints(text: string) {
    const knownSymptoms = [
      '头痛',
      '头疼',
      '发热',
      '发烧',
      '咳嗽',
      '咽痛',
      '嗓子疼',
      '腹泻',
      '拉肚子',
      '恶心',
      '呕吐',
      '流涕',
      '鼻塞',
      '胃痛',
      '胃疼',
      '牙痛',
      '口腔溃疡',
      '皮疹',
      '胸痛',
    ];

    return knownSymptoms.filter((symptom) => text.includes(symptom));
  }

  private pickString(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private pickStringList(value: unknown) {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map((item) => item.trim())
      : [];
  }

  private buildTraceDetail(trace: TraceRow): TraceDetailRow {
    const spec = getConsultationNodeSpec(trace.nodeName);
    const promptMeta = getConsultationPromptByNode(trace.nodeName);
    const traceInput = trace.input ?? {};
    const traceOutput = trace.output ?? {};
    const systemPrompt = this.pickTraceText(traceInput.systemPrompt) ?? this.pickTraceText(traceOutput.systemPrompt);
    const userPrompt = this.pickTraceText(traceInput.userPrompt) ?? this.pickTraceText(traceOutput.userPrompt);
    const promptKey = this.pickTraceText(traceInput.promptKey) ?? promptMeta?.key ?? null;
    const promptVersion = this.pickTraceText(traceInput.promptVersion) ?? promptMeta?.version ?? null;

    return {
      ...trace,
      spec,
      prompt: promptKey
        ? {
            key: promptKey,
            version: promptVersion ?? 'unknown',
            sourceFile: promptMeta?.sourceFile ?? '',
            expectation: spec.promptExpectation ?? null,
            systemPrompt,
            userPrompt,
          }
        : null,
    };
  }

  private buildConsultationTurns(messages: MessageRow[], traces: TraceDetailRow[]): ConsultationTurn[] {
    const sortedMessages = [...messages].sort((left, right) => this.toTimestamp(left.createdAt) - this.toTimestamp(right.createdAt));
    const sortedTraces = [...traces].sort((left, right) => this.toTimestamp(left.createdAt) - this.toTimestamp(right.createdAt));
    const assistantMessages = sortedMessages.filter((item) => item.role === 'ASSISTANT');
    const consumedAssistantIds = new Set<string>();
    const consumedTraceIds = new Set<string>();
    const turns: ConsultationTurn[] = [];

    const userMessages = sortedMessages.filter((item) => item.role === 'USER');

    userMessages
      .forEach((userMessage, index) => {
        const userTime = this.toTimestamp(userMessage.createdAt);
        const nextUserTime = userMessages[index + 1]
          ? this.toTimestamp(userMessages[index + 1].createdAt)
          : Number.POSITIVE_INFINITY;
        const assistantMessage = assistantMessages.find((candidate) => {
          if (consumedAssistantIds.has(candidate.id)) {
            return false;
          }
          const candidateTime = this.toTimestamp(candidate.createdAt);
          return candidateTime >= userTime && candidateTime < nextUserTime;
        }) ?? null;

        if (assistantMessage) {
          consumedAssistantIds.add(assistantMessage.id);
        }

        const turnTraces = sortedTraces.filter((trace) => {
          if (consumedTraceIds.has(trace.id)) {
            return false;
          }
          const traceTime = this.toTimestamp(trace.createdAt);
          const belongsToTurn = traceTime >= userTime && traceTime < nextUserTime;
          if (belongsToTurn) {
            consumedTraceIds.add(trace.id);
          }
          return belongsToTurn;
        });

        turns.push({
          turnIndex: index + 1,
          startedAt: this.toIsoString(userMessage.createdAt),
          completedAt: assistantMessage ? this.toIsoString(assistantMessage.createdAt) : null,
          userMessage,
          assistantMessage,
          traces: turnTraces,
        });
      });

    return turns;
  }

  private pickTraceText(value: unknown) {
    return typeof value === 'string' && value.trim() ? value : null;
  }

  private toTimestamp(value: Date | string) {
    return new Date(value).getTime();
  }

  private toIsoString(value: Date | string) {
    return new Date(value).toISOString();
  }
}
