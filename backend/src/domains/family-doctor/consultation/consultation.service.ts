import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { AgentClientService } from '../agent-client/agent-client.service';
import { AgentTraceStep, AgentUserProfile, AgentRecommend } from '../agent-client/agent-client.types';
import { CabinetService } from '../cabinet/cabinet.service';
import { CurrentHousehold, HouseholdsService } from '@/domains/households/households.service';
import { TencentTtsService } from '../voice/tencent-tts.service';
import { AskConsultationDto } from './dto/ask-consultation.dto';
import { QueryConsultationDto } from './dto/query-consultation.dto';
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
    }
  | {
      type: 'audio_meta';
      codec: 'mp3' | 'wav';
      sampleRate: number;
    }
  | {
      type: 'audio_chunk';
      seq: number;
      text: string;
      audioBase64: string;
      codec: 'mp3' | 'wav';
    }
  | {
      type: 'audio_done';
    }
  | {
      type: 'audio_error';
      message: string;
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
    private readonly ttsService: TencentTtsService,
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

    const [medicines, userProfile, members, history] = await Promise.all([
      this.cabinetService.findAgentBriefsByHousehold(current.householdId, question),
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
    const sessionId = dto.sessionId?.trim() || randomUUID();
    const assistantMessageId = randomUUID();
    const title = this.buildSessionTitle(question);
    const audioStreamer = dto.audio?.enabled === true
      ? this.createAudioStreamer(dto.audio?.codec || 'mp3', onEvent)
      : null;

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
    await onEvent({ type: 'session', sessionId, messageId: assistantMessageId });
    await onEvent({ type: 'status', stage: 'lookup', message: '正在整理家庭药箱信息' });

    const [medicines, userProfile, members, history] = await Promise.all([
      this.cabinetService.findAgentBriefsByHousehold(current.householdId, question),
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
          audioStreamer?.push(event.delta);
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
    await this.createTraces(sessionId, agentResponse.traces ?? []);

    await onEvent({
      type: 'complete',
      sessionId,
      messageId: assistantMessageId,
      answer: agentResponse.answer,
      recommends: agentResponse.recommends,
      disclaimer: agentResponse.disclaimer,
    });

    if (audioStreamer) {
      await audioStreamer.finish();
    }
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

  private createAudioStreamer(
    codec: 'mp3' | 'wav',
    onEvent: (event: ConsultationStreamEvent) => Promise<void> | void,
  ) {
    let pendingText = '';
    let sequence = 0;
    let metadataSent = false;
    let chain = Promise.resolve();
    let failed = false;

    const enqueue = (text: string) => {
      const normalized = text.replace(/\s+/g, ' ').trim();
      if (!normalized || failed) return;

      chain = chain.then(async () => {
        try {
          const audio = await this.ttsService.synthesize({ text: normalized, codec });
          if (!audio.audioBase64) return;

          if (!metadataSent) {
            metadataSent = true;
            await onEvent({
              type: 'audio_meta',
              codec: audio.codec,
              sampleRate: audio.sampleRate,
            });
          }

          sequence += 1;
          await onEvent({
            type: 'audio_chunk',
            seq: sequence,
            text: normalized,
            audioBase64: audio.audioBase64,
            codec: audio.codec,
          });
        } catch (error) {
          failed = true;
          await onEvent({
            type: 'audio_error',
            message: error instanceof Error ? error.message : '语音合成失败',
          });
        }
      });
    };

    return {
      push: (delta: string) => {
        pendingText += delta;
        const { ready, rest } = this.extractSpeakableSentences(pendingText);
        pendingText = rest;
        ready.forEach(enqueue);
      },
      finish: async () => {
        const rest = pendingText.trim();
        pendingText = '';
        if (rest) {
          enqueue(rest);
        }
        await chain;
        if (!failed && metadataSent) {
          await onEvent({ type: 'audio_done' });
        }
      },
    };
  }

  private extractSpeakableSentences(text: string) {
    const ready: string[] = [];
    let start = 0;

    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      const sentenceLength = index - start + 1;
      if (/[。！？!?；;]/.test(char) || sentenceLength >= 80) {
        const sentence = text.slice(start, index + 1).trim();
        if (sentence) {
          ready.push(sentence);
        }
        start = index + 1;
      }
    }

    return {
      ready,
      rest: text.slice(start),
    };
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

    sortedMessages
      .filter((item) => item.role === 'USER')
      .forEach((userMessage, index) => {
        const userTime = this.toTimestamp(userMessage.createdAt);
        const assistantMessage = assistantMessages.find((candidate) => {
          if (consumedAssistantIds.has(candidate.id)) {
            return false;
          }
          return this.toTimestamp(candidate.createdAt) >= userTime;
        }) ?? null;

        if (assistantMessage) {
          consumedAssistantIds.add(assistantMessage.id);
        }

        const assistantTime = assistantMessage ? this.toTimestamp(assistantMessage.createdAt) : Number.POSITIVE_INFINITY;
        const turnTraces = sortedTraces.filter((trace) => {
          if (consumedTraceIds.has(trace.id)) {
            return false;
          }
          const traceTime = this.toTimestamp(trace.createdAt);
          const belongsToTurn = traceTime >= userTime && traceTime <= assistantTime;
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
