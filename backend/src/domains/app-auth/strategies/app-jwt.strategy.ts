import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { RedisService } from '@/infrastructure/redis/redis.service';

type AppJwtPayload = {
  sub: string;
  typ?: string;
  sid?: string;
};

@Injectable()
export class AppJwtStrategy extends PassportStrategy(Strategy, 'app-jwt') {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.APP_JWT_SECRET || process.env.JWT_SECRET || 'your-secret-key',
    });
  }

  async validate(payload: AppJwtPayload) {
    if (payload.typ !== 'app' || !payload.sub || !payload.sid) {
      throw new UnauthorizedException('App 访问令牌无效');
    }

    const activeSid = await this.redisService.get(`app:session:${payload.sub}`);
    if (activeSid !== payload.sid) {
      throw new UnauthorizedException('App 会话已失效');
    }

    const user = await this.prisma.appUser.findFirst({
      where: {
        id: payload.sub,
        status: 'active',
        deletedAt: null,
      },
      select: {
        id: true,
        username: true,
        nickname: true,
        defaultHouseholdId: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('App 用户不存在或已停用');
    }

    return {
      ...user,
      appUserId: user.id,
      userId: user.id,
      sub: user.id,
    };
  }
}
