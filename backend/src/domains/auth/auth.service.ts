import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { CryptoKeysService } from './services/crypto-keys.service';
import { LoginThrottleService } from './services/login-throttle.service';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { RedisService } from '@/infrastructure/redis/redis.service';
import { LoginLogType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private readonly cryptoKeys: CryptoKeysService,
    private readonly loginThrottle: LoginThrottleService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    const userWithRoles = await this.usersService.findById(user.id);
    return { user: userWithRoles, ...(await this.generateAuthTokens(user.id)) };
  }

  async login(loginDto: LoginDto, ip = 'unknown', userAgent?: string) {
    const username = loginDto.username;

    // ① 锁定校验：超过失败阈值则直接拒绝
    await this.loginThrottle.assertNotLocked(username, ip);

    // ② RSA 解密前端密文 → 明文密码
    const plainPassword = this.cryptoKeys.decryptLoginPayload(loginDto.password);

    // ③ 用户/密码校验（保持「用户名或密码错误」统一文案，避免泄露用户存在性）
    const user = await this.usersService.findByUsername(username);
    const isPasswordValid =
      !!user && (await bcrypt.compare(plainPassword, user.password));

    if (!user || !isPasswordValid) {
      const failCount = await this.loginThrottle.recordFailure(username, ip);
      const hint = failCount > 0 ? `（已失败 ${failCount} 次）` : '';
      // 记录登录失败日志
      await this.prisma.loginLog.create({
        data: {
          userId: user?.id,
          username,
          type: LoginLogType.LOGIN,
          ip,
          userAgent: userAgent || '',
          success: false,
          message: `用户名或密码错误${hint}`,
        },
      });
      throw new UnauthorizedException(`用户名或密码错误${hint}`);
    }

    // ④ 登录成功 → 清零计数
    await this.loginThrottle.reset(username, ip);

    const userWithRoles = await this.usersService.findById(user.id);

    // 记录登录成功日志
    await this.prisma.loginLog.create({
      data: {
        userId: user.id,
        username: user.username,
        type: LoginLogType.LOGIN,
        ip,
        userAgent: userAgent || '',
        success: true,
      },
    });

    return { user: userWithRoles, ...(await this.generateAuthTokens(user.id)) };
  }

  generateToken(userId: number): string {
    const payload = { sub: userId };
    return this.jwtService.sign(payload);
  }

  generateRefreshToken(userId: number): string {
    const payload = { sub: userId };
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'your-secret-key',
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as any,
    });
  }

  async generateAuthTokens(userId: number) {
    const token = this.generateToken(userId);
    const refreshToken = this.generateRefreshToken(userId);
    await this.cacheTokenPair(userId, token, refreshToken);
    return { token, refreshToken };
  }

  async verifyRefreshToken(refreshToken: string): Promise<{ sub: number }> {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: number }>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'your-secret-key',
      });
      const isValid = await this.redis.validateToken(
        payload.sub,
        refreshToken,
        'refresh',
      );
      if (!isValid) {
        throw new UnauthorizedException('刷新令牌无效或已过期');
      }
      return payload;
    }
    catch {
      throw new UnauthorizedException('刷新令牌无效或已过期');
    }
  }

  async verifyAccessToken(token: string): Promise<{ sub: number }> {
    try {
      return await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'your-secret-key',
      });
    }
    catch {
      throw new UnauthorizedException('访问令牌无效或已过期');
    }
  }

  async refresh(refreshToken: string, ip = 'unknown', userAgent?: string) {
    let payload: { sub: number };

    try {
      payload = await this.verifyRefreshToken(refreshToken);
    } catch {
      await this.prisma.loginLog.create({
        data: {
          type: LoginLogType.REFRESH,
          ip,
          userAgent: userAgent || '',
          success: false,
          message: '刷新令牌无效或已过期',
        },
      });
      throw new UnauthorizedException('刷新令牌无效或已过期');
    }

    let user: Awaited<ReturnType<UsersService['findById']>>;
    try {
      user = await this.usersService.findById(payload.sub);
    } catch {
      await this.prisma.loginLog.create({
        data: {
          userId: payload.sub,
          type: LoginLogType.REFRESH,
          ip,
          userAgent: userAgent || '',
          success: false,
          message: '用户不存在或已停用',
        },
      });
      throw new UnauthorizedException('刷新令牌无效或已过期');
    }

    await this.prisma.loginLog.create({
      data: {
        userId: user.id,
        username: user.username,
        type: LoginLogType.REFRESH,
        ip,
        userAgent: userAgent || '',
        success: true,
      },
    });

    return { user, ...(await this.generateAuthTokens(user.id)) };
  }

  async logout(userId: number): Promise<{ success: true }> {
    await this.redis.deleteUserTokens(userId);
    return { success: true };
  }

  private async cacheTokenPair(
    userId: number,
    accessToken: string,
    refreshToken: string,
  ): Promise<void> {
    await Promise.all([
      this.redis.setToken(userId, accessToken, this.getTokenTtlSeconds(accessToken), 'access'),
      this.redis.setToken(userId, refreshToken, this.getTokenTtlSeconds(refreshToken), 'refresh'),
    ]);
  }

  private getTokenTtlSeconds(token: string): number {
    const payload = this.jwtService.decode(token) as { exp?: number } | null;
    if (!payload?.exp) {
      throw new InternalServerErrorException('令牌缺少过期时间');
    }
    return Math.max(1, payload.exp - Math.floor(Date.now() / 1000));
  }
}
