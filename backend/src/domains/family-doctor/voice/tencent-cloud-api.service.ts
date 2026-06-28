import { BadGatewayException, Injectable } from '@nestjs/common';
import { createHash, createHmac } from 'crypto';

type TencentApiRequest = {
  service: string;
  host: string;
  action: string;
  version: string;
  payload: Record<string, unknown>;
  region?: string;
};

@Injectable()
export class TencentCloudApiService {
  async call<T>(request: TencentApiRequest): Promise<T> {
    const secretId = process.env.TENCENT_SECRET_ID;
    const secretKey = process.env.TENCENT_SECRET_KEY;

    if (!secretId || !secretKey) {
      throw new BadGatewayException('腾讯云语音服务未配置密钥');
    }

    const body = JSON.stringify(request.payload);
    const timestamp = Math.floor(Date.now() / 1000);
    const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
    const signedHeaders = 'content-type;host;x-tc-action';
    const canonicalHeaders = [
      'content-type:application/json; charset=utf-8',
      `host:${request.host}`,
      `x-tc-action:${request.action.toLowerCase()}`,
    ].join('\n') + '\n';
    const canonicalRequest = [
      'POST',
      '/',
      '',
      canonicalHeaders,
      signedHeaders,
      this.sha256(body),
    ].join('\n');
    const credentialScope = `${date}/${request.service}/tc3_request`;
    const stringToSign = [
      'TC3-HMAC-SHA256',
      String(timestamp),
      credentialScope,
      this.sha256(canonicalRequest),
    ].join('\n');
    const signature = this.signString(secretKey, date, request.service, stringToSign);
    const authorization = [
      'TC3-HMAC-SHA256',
      `Credential=${secretId}/${credentialScope}`,
      `SignedHeaders=${signedHeaders}`,
      `Signature=${signature}`,
    ].join(', ');

    const response = await fetch(`https://${request.host}`, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json; charset=utf-8',
        Host: request.host,
        'X-TC-Action': request.action,
        'X-TC-Version': request.version,
        'X-TC-Timestamp': String(timestamp),
        'X-TC-Language': 'zh-CN',
        ...(request.region ? { 'X-TC-Region': request.region } : {}),
      },
      body,
    });

    const text = await response.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new BadGatewayException(`腾讯云语音服务返回异常: ${text}`);
    }

    if (!response.ok) {
      throw new BadGatewayException(`腾讯云语音服务请求失败: HTTP ${response.status} ${text}`);
    }

    const envelope = data as { Response?: { Error?: { Message?: string; Code?: string } } };
    if (envelope.Response?.Error) {
      const error = envelope.Response.Error;
      throw new BadGatewayException(`腾讯云语音服务错误: ${error.Code ?? 'Unknown'} ${error.Message ?? ''}`.trim());
    }

    return data as T;
  }

  private sha256(value: string) {
    return createHash('sha256').update(value, 'utf8').digest('hex');
  }

  private hmac(key: Buffer | string, value: string) {
    return createHmac('sha256', key).update(value, 'utf8').digest();
  }

  private signString(secretKey: string, date: string, service: string, stringToSign: string) {
    const secretDate = this.hmac(`TC3${secretKey}`, date);
    const secretService = this.hmac(secretDate, service);
    const secretSigning = this.hmac(secretService, 'tc3_request');
    return createHmac('sha256', secretSigning).update(stringToSign, 'utf8').digest('hex');
  }
}
