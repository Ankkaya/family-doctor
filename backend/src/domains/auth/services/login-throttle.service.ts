import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../infrastructure/redis/redis.service';

/**
 * 登录限频策略：
 *  - 按 IP + 用户名 双维度计数
 *  - 5 分钟内累计失败 5 次 → 锁定 15 分钟
 *  - 登录成功立刻清零
 */
@Injectable()
export class LoginThrottleService {
  /** 滚动窗口（秒）—— 失败次数累计周期 */
  private readonly windowSec = 5 * 60;
  /** 锁定时长（秒）—— 触发阈值后冷却时间 */
  private readonly lockSec = 15 * 60;
  /** 触发锁定的失败阈值 */
  private readonly maxFails = 5;
  private readonly logger = new Logger(LoginThrottleService.name);

  constructor(private readonly redis: RedisService) {}

  /** 登录前调用：若已锁定则抛出异常；Redis 不可用时降级放行 */
  async assertNotLocked(username: string, ip: string): Promise<void> {
    const keys = this.buildKeys(username, ip);
    let lockTtls: number[];
    try {
      lockTtls = await Promise.all(keys.lockKeys.map((k) => this.ttl(k)));
    } catch (err) {
      this.warnDegrade('assertNotLocked', err);
      return;
    }
    const remain = Math.max(0, ...lockTtls);
    if (remain > 0) {
      throw new HttpException(
        `登录尝试过于频繁，请在 ${remain} 秒后重试`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /** 登录失败时调用：累计 + 必要时上锁；Redis 不可用时静默降级 */
  async recordFailure(username: string, ip: string): Promise<number> {
    const { failKeys, lockKeys } = this.buildKeys(username, ip);
    let maxCount = 0;
    try {
      for (let i = 0; i < failKeys.length; i++) {
        const count = await this.incr(failKeys[i], this.windowSec);
        maxCount = Math.max(maxCount, count);
        if (count >= this.maxFails) {
          await this.redis.set(lockKeys[i], '1', this.lockSec);
          await this.redis.del(failKeys[i]);
        }
      }
    } catch (err) {
      this.warnDegrade('recordFailure', err);
    }
    return maxCount;
  }

  /** 登录成功调用：清零计数与锁；Redis 不可用时静默降级 */
  async reset(username: string, ip: string): Promise<void> {
    const { failKeys, lockKeys } = this.buildKeys(username, ip);
    try {
      await Promise.all(
        [...failKeys, ...lockKeys].map((k) => this.redis.del(k)),
      );
    } catch (err) {
      this.warnDegrade('reset', err);
    }
  }

  private warnDegrade(scope: string, err: unknown) {
    this.logger.warn(
      `[degrade] login-throttle.${scope} skipped due to Redis error: ${(err as Error)?.message}`,
    );
  }

  private buildKeys(username: string, ip: string) {
    const u = username?.toLowerCase()?.trim() || 'unknown';
    return {
      failKeys: [`login:fail:ip:${ip}`, `login:fail:user:${u}`],
      lockKeys: [`login:lock:ip:${ip}`, `login:lock:user:${u}`],
    };
  }

  /** Redis INCR + 首次设置过期时间 */
  private async incr(key: string, ttlSec: number): Promise<number> {
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, ttlSec);
    }
    return count;
  }

  private async ttl(key: string): Promise<number> {
    const v = await this.redis.ttl(key);
    return v > 0 ? v : 0;
  }
}
