import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { UpsertSystemSettingDto } from './dto/upsert-system-setting.dto';
import { SystemSettingVo } from './vo/system-setting.vo';

export interface MiniProgramAuthSetting {
  wechatAppId: string;
  wechatAppSecret: string;
}

export interface WechatPaySetting {
  mchId: string;
  mchSerialNo: string;
  apiV3Key: string;
  notifyUrl: string;
  refundNotifyUrl: string;
  privateKey: string;
  platformPublicKey: string;
  platformCertPath: string;
}

const DEFAULT_MINI_PROGRAM_AUTH_SETTING: MiniProgramAuthSetting = {
  wechatAppId: '',
  wechatAppSecret: '',
};

const DEFAULT_WECHAT_PAY_SETTING: WechatPaySetting = {
  mchId: '',
  mchSerialNo: '',
  apiV3Key: '',
  notifyUrl: '',
  refundNotifyUrl: '',
  privateKey: '',
  platformPublicKey: '',
  platformCertPath: '',
};

@Injectable()
export class SystemSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const list = await this.prisma.systemSetting.findMany({
      orderBy: [{ category: 'asc' }, { id: 'asc' }],
    });
    return SystemSettingVo.fromEntities(list);
  }

  async findByCategory(category: string) {
    const list = await this.prisma.systemSetting.findMany({
      where: { category },
      orderBy: { id: 'asc' },
    });
    return SystemSettingVo.fromEntities(list);
  }

  async getRawByKey(key: string) {
    return this.prisma.systemSetting.findUnique({ where: { key } });
  }

  async upsert(dto: UpsertSystemSettingDto) {
    const saved = await this.prisma.systemSetting.upsert({
      where: { key: dto.key },
      update: {
        category: dto.category,
        name: dto.name,
        value: dto.value,
        description: dto.description?.trim() || null,
      },
      create: {
        key: dto.key,
        category: dto.category,
        name: dto.name,
        value: dto.value,
        description: dto.description?.trim() || null,
      },
    });

    return SystemSettingVo.fromEntity(saved);
  }

  async getMiniProgramAuthSetting(): Promise<MiniProgramAuthSetting> {
    const setting = await this.getRawByKey('mini-program.auth');
    const value = (setting?.value || {}) as Record<string, any>;

    return {
      wechatAppId: String(value.wechatAppId ?? process.env.WECHAT_APP_ID ?? ''),
      wechatAppSecret: String(value.wechatAppSecret ?? process.env.WECHAT_APP_SECRET ?? ''),
    };
  }

  async getWechatPaySetting(): Promise<WechatPaySetting> {
    const setting = await this.getRawByKey('wechat.pay');
    const value = (setting?.value || {}) as Record<string, any>;

    return {
      mchId: String(value.mchId ?? DEFAULT_WECHAT_PAY_SETTING.mchId),
      mchSerialNo: String(value.mchSerialNo ?? DEFAULT_WECHAT_PAY_SETTING.mchSerialNo),
      apiV3Key: String(value.apiV3Key ?? DEFAULT_WECHAT_PAY_SETTING.apiV3Key),
      notifyUrl: String(value.notifyUrl ?? DEFAULT_WECHAT_PAY_SETTING.notifyUrl),
      refundNotifyUrl: String(value.refundNotifyUrl ?? DEFAULT_WECHAT_PAY_SETTING.refundNotifyUrl),
      privateKey: String(value.privateKey ?? DEFAULT_WECHAT_PAY_SETTING.privateKey),
      platformPublicKey: String(value.platformPublicKey ?? DEFAULT_WECHAT_PAY_SETTING.platformPublicKey),
      platformCertPath: String(value.platformCertPath ?? DEFAULT_WECHAT_PAY_SETTING.platformCertPath),
    };
  }
}
