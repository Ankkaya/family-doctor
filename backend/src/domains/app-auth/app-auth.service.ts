import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { BufferedFile } from '@/infrastructure/minio/dto/file.dto';
import { MinioService } from '@/infrastructure/minio/minio.service';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { LoginAppUserDto } from './dto/login-app-user.dto';
import { RegisterAppUserDto } from './dto/register-app-user.dto';
import { UpdateAppProfileDto } from './dto/update-app-profile.dto';

type AppTokenPayload = {
  sub: string;
  typ: 'app';
};

type RegistrationPolicy = {
  code?: string;
  enabled?: boolean;
  maxActivations?: number | null;
  usedActivations?: number;
  expiresAt?: string | null;
};

const REGISTRATION_POLICY_KEY = 'app_registration_policy';

const APP_USER_PROFILE_SELECT = {
  id: true,
  username: true,
  nickname: true,
  avatarUrl: true,
  age: true,
  gender: true,
  allergies: true,
  chronicDiseases: true,
  medicationHistory: true,
  defaultHouseholdId: true,
} satisfies Prisma.AppUserSelect;

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

@Injectable()
export class AppAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly minioService: MinioService,
  ) {}

  async createAnonymousIdentity() {
    const identity = await this.prisma.$transaction(async (tx) => {
      const user = await tx.appUser.create({
        data: {
          nickname: '家庭用户',
          status: 'active',
        },
      });
      const household = await tx.household.create({
        data: {
          name: '我的家庭',
          ownerUserId: user.id,
          code: this.generateHouseholdCode(),
        },
      });

      await tx.householdMember.create({
        data: {
          householdId: household.id,
          userId: user.id,
          role: 'owner',
          displayName: null,
        },
      });
      await tx.appUser.update({
        where: { id: user.id },
        data: { defaultHouseholdId: household.id },
      });

      return { user, household };
    });

    return {
      ...this.generateTokens(identity.user.id),
      user: {
        id: identity.user.id,
        nickname: identity.user.nickname,
      },
      defaultHousehold: {
        id: identity.household.id,
        name: identity.household.name,
      },
    };
  }

  async register(dto: RegisterAppUserDto) {
    const username = this.normalizeUsername(dto.username);
    const registrationCode = dto.registrationCode.trim().toUpperCase();
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const policy = await this.loadRegistrationPolicy(tx);
      this.assertRegistrationPolicy(policy, registrationCode);

      const existing = await tx.appUser.findFirst({
        where: {
          username,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (existing) {
        throw new ConflictException('用户名已存在');
      }

      const createdUser = await tx.appUser.create({
        data: {
          username,
          passwordHash,
          nickname: username,
          status: 'active',
        },
        select: {
          ...APP_USER_PROFILE_SELECT,
        },
      });

      await tx.systemSetting.update({
        where: { key: REGISTRATION_POLICY_KEY },
        data: {
          value: {
            ...policy,
            usedActivations: (policy.usedActivations ?? 0) + 1,
            lastActivatedAt: new Date().toISOString(),
          },
        },
      });

      return createdUser;
    });

    return {
      ...this.generateTokens(user.id),
      user,
    };
  }

  async login(dto: LoginAppUserDto) {
    const username = this.normalizeUsername(dto.username);
    const user = await this.prisma.appUser.findFirst({
      where: {
        username,
        deletedAt: null,
        status: 'active',
      },
      select: {
        ...APP_USER_PROFILE_SELECT,
        passwordHash: true,
      },
    });

    if (!user?.passwordHash) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const passwordMatched = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatched) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const { passwordHash: _passwordHash, ...safeUser } = user;

    return {
      ...this.generateTokens(user.id),
      user: safeUser,
    };
  }

  async refresh(refreshToken: string) {
    const payload = await this.verifyRefreshToken(refreshToken);
    const user = await this.prisma.appUser.findFirst({
      where: {
        id: payload.sub,
        status: 'active',
        deletedAt: null,
      },
      select: {
        ...APP_USER_PROFILE_SELECT,
      },
    });

    if (!user) {
      throw new UnauthorizedException('App 用户不存在或已停用');
    }

    return {
      ...this.generateTokens(user.id),
      user,
    };
  }

  async updateProfile(appUserId: string, dto: UpdateAppProfileDto) {
    const data: Prisma.AppUserUpdateInput = {};

    if ('avatarUrl' in dto) data.avatarUrl = this.normalizeOptionalText(dto.avatarUrl);
    if ('age' in dto) data.age = dto.age ?? null;
    if ('gender' in dto) data.gender = dto.gender ?? null;
    if ('allergies' in dto) data.allergies = this.normalizeOptionalProfileText(dto.allergies);
    if ('chronicDiseases' in dto) {
      data.chronicDiseases = this.normalizeOptionalProfileText(dto.chronicDiseases);
    }
    if ('medicationHistory' in dto) {
      data.medicationHistory = this.normalizeOptionalProfileText(dto.medicationHistory);
    }

    return this.prisma.appUser.update({
      where: { id: appUserId },
      data,
      select: APP_USER_PROFILE_SELECT,
    });
  }

  async uploadAvatar(appUserId: string, file: BufferedFile) {
    const uploaded = await this.minioService.uploadFile(file, `app/avatar/${appUserId}`);
    return this.prisma.appUser.update({
      where: { id: appUserId },
      data: {
        avatarUrl: uploaded.url,
      },
      select: APP_USER_PROFILE_SELECT,
    });
  }

  private generateTokens(appUserId: string) {
    const payload: AppTokenPayload = { sub: appUserId, typ: 'app' };
    return {
      token: this.jwtService.sign(payload, {
        secret: this.getAccessSecret(),
        expiresIn: (process.env.APP_JWT_EXPIRES_IN || '7d') as any,
      }),
      refreshToken: this.jwtService.sign(payload, {
        secret: this.getRefreshSecret(),
        expiresIn: (process.env.APP_JWT_REFRESH_EXPIRES_IN || '30d') as any,
      }),
    };
  }

  private async verifyRefreshToken(refreshToken: string): Promise<AppTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<AppTokenPayload>(refreshToken, {
        secret: this.getRefreshSecret(),
      });
      if (payload.typ !== 'app' || !payload.sub) {
        throw new UnauthorizedException('App 刷新令牌无效');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('App 刷新令牌无效或已过期');
    }
  }

  private getAccessSecret() {
    return process.env.APP_JWT_SECRET || process.env.JWT_SECRET || 'your-secret-key';
  }

  private getRefreshSecret() {
    return process.env.APP_JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET || this.getAccessSecret();
  }

  private normalizeUsername(username: string) {
    return username.trim().toLowerCase();
  }

  private normalizeOptionalText(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private normalizeOptionalProfileText(value?: string | null) {
    const normalized = this.normalizeOptionalText(value);
    if (!normalized) return null;

    const compact = normalized.replace(/\s+/g, '').toLowerCase();
    return EMPTY_PROFILE_VALUES.has(compact) ? null : normalized;
  }

  private async loadRegistrationPolicy(tx: {
    $queryRaw: <T = unknown>(query: Prisma.Sql) => Promise<T>;
  }): Promise<RegistrationPolicy> {
    const rows = await tx.$queryRaw<{ value: RegistrationPolicy }[]>(Prisma.sql`
      SELECT "value"
      FROM "SystemSetting"
      WHERE "key" = ${REGISTRATION_POLICY_KEY}
      LIMIT 1
    `);
    const policy = rows[0]?.value;

    if (!policy || typeof policy !== 'object') {
      throw new ForbiddenException('系统注册码未配置');
    }

    return policy;
  }

  private assertRegistrationPolicy(policy: RegistrationPolicy, registrationCode: string) {
    if (policy.enabled === false) {
      throw new ForbiddenException('系统注册码已停用');
    }

    if (!policy.code || policy.code.trim().toUpperCase() !== registrationCode) {
      throw new ForbiddenException('系统注册码无效');
    }

    if (policy.expiresAt && new Date(policy.expiresAt).getTime() < Date.now()) {
      throw new ForbiddenException('系统注册码已过期');
    }

    const maxActivations = policy.maxActivations ?? null;
    const usedActivations = policy.usedActivations ?? 0;
    if (maxActivations !== null && usedActivations >= maxActivations) {
      throw new ForbiddenException('系统注册码激活次数已用完');
    }
  }

  private generateHouseholdCode() {
    return Math.floor(Math.random() * 0x1000000)
      .toString(16)
      .padStart(6, '0')
      .toUpperCase();
  }
}
