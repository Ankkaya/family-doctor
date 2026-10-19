import { ForbiddenException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

type Scope = { userId: string; householdId: string; sessionId: string; expires: number; debug?: boolean };

function secret() {
  const value = process.env.AGENT_INTERNAL_TOKEN;
  if (!value) throw new ForbiddenException('Agent 内部凭证未配置');
  return value;
}

export function issueCabinetScope(input: Omit<Scope, 'expires'>): string {
  const payload = Buffer.from(JSON.stringify({ ...input, expires: Date.now() + 15 * 60_000 })).toString('base64url');
  return `${payload}.${createHmac('sha256', secret()).update(payload).digest('base64url')}`;
}

export function verifyCabinetScope(token: string): Scope {
  try {
    const [payload, signature, extra] = token.split('.');
    const expected = createHmac('sha256', secret()).update(payload).digest();
    const actual = Buffer.from(signature, 'base64url');
    if (extra || actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error();
    const scope = JSON.parse(Buffer.from(payload, 'base64url').toString()) as Scope;
    if (!scope.userId || !scope.householdId || !scope.sessionId || !Number.isFinite(scope.expires) || scope.expires <= Date.now()) throw new Error();
    return scope;
  } catch {
    throw new ForbiddenException('药箱工具凭证无效或已过期');
  }
}
