import { ConsultationHistoryCacheService, HISTORY_CACHE_TTL_SECONDS } from './consultation-history-cache.service';

describe('ConsultationHistoryCacheService', () => {
  function setup() {
    const redis = { cacheCommand: jest.fn().mockResolvedValue(null) };
    return { redis, cache: new ConsultationHistoryCacheService(redis as any) };
  }
  const message = { id: 'message-1', role: 'USER', content: '头痛', createdAt: '2026-10-19T00:00:00.000Z' } as const;

  it('distinguishes a cache miss from cached empty history', async () => {
    const { redis, cache } = setup();
    expect(await cache.get('s1')).toBeNull();
    redis.cacheCommand.mockResolvedValueOnce('[]');
    expect(await cache.get('s1')).toEqual([]);
  });

  it('returns cached role messages', async () => {
    const { redis, cache } = setup();
    redis.cacheCommand.mockResolvedValueOnce(JSON.stringify([message]));
    expect(await cache.get('s1')).toEqual([message]);
    expect(redis.cacheCommand).toHaveBeenCalledWith(['GET', 'consultation:history:v1:s1']);
  });

  it.each(['broken json', '{}', '[{"role":"system"}]', JSON.stringify(Array(11).fill(message))])('invalidates malformed data: %s', async raw => {
    const { redis, cache } = setup();
    redis.cacheCommand.mockResolvedValueOnce(raw);
    expect(await cache.get('s1')).toBeNull();
    expect(redis.cacheCommand).toHaveBeenLastCalledWith(['DEL', 'consultation:history:v1:s1']);
  });

  it('treats Redis read failure as a miss even if invalidation also fails', async () => {
    const { redis, cache } = setup();
    redis.cacheCommand.mockRejectedValue(new Error('offline'));
    expect(await cache.get('s1')).toBeNull();
  });

  it('seeds at most ten records with expiration and without overwriting newer data', async () => {
    const { redis, cache } = setup();
    const messages = Array.from({ length: 12 }, (_, index) => ({ ...message, id: String(index) }));
    await cache.seed('s1', messages);
    expect(redis.cacheCommand).toHaveBeenCalledWith([
      'SET', 'consultation:history:v1:s1', JSON.stringify(messages.slice(-10)), 'EX', String(HISTORY_CACHE_TTL_SECONDS), 'NX',
    ]);
  });

  it('signals that a missing cache needs a database seed', async () => {
    const { redis, cache } = setup();
    redis.cacheCommand.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
    expect(await cache.append('s1', [message])).toBe(false);
    expect(await cache.append('s1', [message])).toBe(true);
  });
});
