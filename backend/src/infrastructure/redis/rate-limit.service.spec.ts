import { RateLimitService } from './rate-limit.service';

describe('RateLimitService', () => {
  it('starts the window on the first request and rejects requests over the limit', async () => {
    const redis = {
      incr: jest.fn()
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(3),
      expire: jest.fn().mockResolvedValue(undefined),
    };
    const service = new RateLimitService(redis as any);

    await service.assertWithinLimit('consultation', 'user-1', 2, 60);
    await service.assertWithinLimit('consultation', 'user-1', 2, 60);
    await expect(service.assertWithinLimit('consultation', 'user-1', 2, 60))
      .rejects.toMatchObject({ status: 429 });

    expect(redis.expire).toHaveBeenCalledTimes(1);
    expect(redis.expire).toHaveBeenCalledWith(expect.stringContaining('rate-limit:consultation:'), 60);
  });
});
