import { HttpException, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { RedisService } from './redis.service';

@Injectable()
export class RateLimitService {
  constructor(private readonly redis: RedisService) {}

  async assertWithinLimit(
    scope: string,
    subject: string,
    limit: number,
    windowSeconds: number,
  ) {
    const normalizedSubject = createHash('sha256').update(subject || 'unknown').digest('hex');
    const key = `rate-limit:${scope}:${normalizedSubject}`;
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, windowSeconds);
    }
    if (count > limit) {
      throw new HttpException('请求过于频繁，请稍后再试', 429);
    }
  }
}
