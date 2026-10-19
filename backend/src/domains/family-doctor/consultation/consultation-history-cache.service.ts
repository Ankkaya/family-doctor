import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/infrastructure/redis/redis.service';
import type { AgentHistoryMessage } from '../agent-client/agent-client.types';

export type CachedHistoryMessage = AgentHistoryMessage & { id: string };
export const HISTORY_CACHE_TTL_SECONDS = 3600;

// Merge committed messages atomically, so overlapping turns cannot overwrite
// each other's history. A missing key must first be seeded from PostgreSQL.
const APPEND_HISTORY = `
local raw = redis.call('GET', KEYS[1])
if not raw then return 0 end
local history = cjson.decode(raw)
local added = cjson.decode(ARGV[1])
local byId = {}
for _, message in ipairs(history) do byId[message.id] = message end
for _, message in ipairs(added) do byId[message.id] = message end
local merged = {}
for _, message in pairs(byId) do table.insert(merged, message) end
table.sort(merged, function(a, b)
  if a.createdAt == b.createdAt then return a.id < b.id end
  return a.createdAt < b.createdAt
end)
while #merged > 10 do table.remove(merged, 1) end
redis.call('SET', KEYS[1], cjson.encode(merged), 'EX', ARGV[2])
return 1
`;

@Injectable()
export class ConsultationHistoryCacheService {
  private readonly logger = new Logger(ConsultationHistoryCacheService.name);

  constructor(private readonly redis: RedisService) {}

  private key(sessionId: string) {
    return `consultation:history:v1:${sessionId}`;
  }

  async get(sessionId: string): Promise<CachedHistoryMessage[] | null> {
    try {
      const raw = await this.redis.cacheCommand(['GET', this.key(sessionId)]);
      if (raw === null) return null;
      const messages: unknown = JSON.parse(String(raw));
      if (!Array.isArray(messages) || messages.length > 10 || !messages.every(message =>
        message && typeof message.id === 'string' && message.id.length > 0 &&
        (message.role === 'USER' || message.role === 'ASSISTANT') &&
        typeof message.content === 'string' && typeof message.createdAt === 'string' &&
        !Number.isNaN(Date.parse(message.createdAt)),
      )) throw new Error('Invalid history cache');
      return messages as CachedHistoryMessage[];
    } catch {
      this.logger.warn('History cache read failed; falling back to PostgreSQL');
      await this.invalidate(sessionId).catch(() => {});
      return null;
    }
  }

  async seed(sessionId: string, messages: CachedHistoryMessage[]): Promise<void> {
    // Do not overwrite a newer cache populated while the database was queried.
    await this.redis.cacheCommand([
      'SET', this.key(sessionId), JSON.stringify(messages.slice(-10)),
      'EX', String(HISTORY_CACHE_TTL_SECONDS), 'NX',
    ]);
  }

  async append(sessionId: string, messages: CachedHistoryMessage[]): Promise<boolean> {
    const result = await this.redis.cacheCommand([
      'EVAL', APPEND_HISTORY, '1', this.key(sessionId), JSON.stringify(messages),
      String(HISTORY_CACHE_TTL_SECONDS),
    ]);
    return Number(result) === 1;
  }

  async invalidate(sessionId: string): Promise<void> {
    await this.redis.cacheCommand(['DEL', this.key(sessionId)]);
  }
}
