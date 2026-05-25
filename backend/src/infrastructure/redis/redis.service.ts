import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

type TokenType = 'access' | 'refresh';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD || undefined,
    });

    // 错误处理
    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      console.log('Redis Client Connected');
    });
  }

  async onModuleInit() {
    try {
      await this.client.connect();
      console.log('Redis service initialized successfully');
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.disconnect();
    }
  }

  // Token相关操作
  async setToken(
    userId: number,
    token: string,
    ttl: number = 3600,
    type: TokenType = 'access',
  ): Promise<void> {
    try {
      await this.client.set(this.buildTokenKey(userId, type), token, { EX: ttl });
    } catch (error) {
      console.error('Redis setToken error:', error);
      throw error;
    }
  }

  async getToken(
    userId: number,
    type: TokenType = 'access',
  ): Promise<string | null> {
    try {
      return await this.client.get(this.buildTokenKey(userId, type));
    } catch (error) {
      console.error('Redis getToken error:', error);
      return null;
    }
  }

  async deleteToken(
    userId: number,
    type: TokenType = 'access',
  ): Promise<void> {
    try {
      await this.client.del(this.buildTokenKey(userId, type));
    } catch (error) {
      console.error('Redis deleteToken error:', error);
      throw error;
    }
  }

  async deleteUserTokens(userId: number): Promise<void> {
    try {
      await this.client.del([
        this.buildTokenKey(userId, 'access'),
        this.buildTokenKey(userId, 'refresh'),
      ]);
    } catch (error) {
      console.error('Redis deleteUserTokens error:', error);
      throw error;
    }
  }

  async tokenExists(
    userId: number,
    type: TokenType = 'access',
  ): Promise<boolean> {
    try {
      const result = await this.client.exists(this.buildTokenKey(userId, type));
      return result === 1;
    } catch (error) {
      console.error('Redis tokenExists error:', error);
      return false;
    }
  }

  async validateToken(
    userId: number,
    token: string,
    type: TokenType = 'access',
  ): Promise<boolean> {
    try {
      const cachedToken = await this.getToken(userId, type);
      return cachedToken === token;
    } catch (error) {
      console.error('Redis validateToken error:', error);
      return false;
    }
  }

  // 通用Redis操作（可选，用于扩展）
  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      const options = ttl ? { EX: ttl } : undefined;
      await this.client.set(key, value, options);
    } catch (error) {
      console.error('Redis set error:', error);
      throw error;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error('Redis del error:', error);
      throw error;
    }
  }

  async incr(key: string): Promise<number> {
    return Number(await this.client.incr(key));
  }

  async expire(key: string, ttl: number): Promise<void> {
    await this.client.expire(key, ttl);
  }

  async ttl(key: string): Promise<number> {
    return Number(await this.client.ttl(key));
  }

  private buildTokenKey(userId: number, type: TokenType): string {
    return `token:${type}:${userId}`;
  }
}
