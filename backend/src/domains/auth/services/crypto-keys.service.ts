import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { constants, generateKeyPairSync, privateDecrypt } from 'crypto';

/**
 * 登录密码 RSA 加密：
 *  - 启动时优先从环境变量 LOGIN_RSA_PUBLIC_KEY / LOGIN_RSA_PRIVATE_KEY 加载（PEM 格式）
 *  - 若未配置则进程内生成一对 2048 位 RSA 密钥（重启会重新生成，仅用于开发）
 *  - 公钥通过 GET /auth/public-key 暴露给前端
 *  - 解密前验证密文中的 timestamp 在 5 分钟之内（防重放）
 *
 * 前端加密格式约定：
 *   plaintext = `${password}::${timestamp}`
 *   ciphertext = base64( RSA-OAEP-SHA256_encrypt(publicKey, plaintext) )
 */
@Injectable()
export class CryptoKeysService implements OnModuleInit {
  private readonly logger = new Logger(CryptoKeysService.name);
  private publicKey!: string;
  private privateKey!: string;
  /** 时间戳允许漂移（毫秒） */
  private readonly maxClockSkewMs = 5 * 60 * 1000;

  onModuleInit() {
    const envPub = process.env.LOGIN_RSA_PUBLIC_KEY?.replace(/\\n/g, '\n');
    const envPriv = process.env.LOGIN_RSA_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (envPub && envPriv) {
      this.publicKey = envPub;
      this.privateKey = envPriv;
      this.logger.log('Loaded RSA key pair from environment variables');
      return;
    }

    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    this.publicKey = publicKey;
    this.privateKey = privateKey;
    this.logger.warn(
      'No LOGIN_RSA_*_KEY env provided, generated ephemeral RSA key pair (development only)',
    );
  }

  /** 暴露给前端的公钥 + 服务器时间 */
  getPublicKey() {
    return {
      publicKey: this.publicKey,
      timestamp: Date.now(),
    };
  }

  /**
   * 解密登录密文，返回明文密码
   * @param cipherBase64 前端 Web Crypto 输出的 base64 字符串
   * @returns 明文密码
   */
  decryptLoginPayload(cipherBase64: string): string {
    if (!cipherBase64 || typeof cipherBase64 !== 'string') {
      throw new BadRequestException('密码格式错误');
    }

    let plain: string;
    try {
      const buf = Buffer.from(cipherBase64, 'base64');
      plain = privateDecrypt(
        {
          key: this.privateKey,
          padding: constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        buf,
      ).toString('utf8');
    } catch (err) {
      this.logger.warn(`Login payload decrypt failed: ${(err as Error).message}`);
      throw new BadRequestException('密码解密失败，请刷新页面后重试');
    }

    // 约定格式 password::timestamp
    const sep = plain.lastIndexOf('::');
    if (sep < 0) {
      // 兼容未带时间戳的旧客户端：直接当作密码返回
      return plain;
    }

    const password = plain.slice(0, sep);
    const tsStr = plain.slice(sep + 2);
    const ts = Number(tsStr);
    if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > this.maxClockSkewMs) {
      throw new BadRequestException('登录请求已过期，请重试');
    }
    return password;
  }
}
