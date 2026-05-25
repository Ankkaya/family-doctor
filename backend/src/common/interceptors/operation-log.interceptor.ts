import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { LogAction } from '@prisma/client';

@Injectable()
export class OperationLogInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startAt = Date.now();

    return next.handle().pipe(
      tap({
        next: (responseBody) => {
          void this.writeLog(request, response, startAt, responseBody);
        },
        error: (error) => {
          void this.writeLog(request, response, startAt, undefined, error);
        },
      }),
    );
  }

  private async writeLog(
    request: any,
    response: any,
    startAt: number,
    responseBody?: any,
    error?: any,
  ): Promise<void> {
    const method = request.method;
    const path = this.getRequestPath(request);

    // 仅记录写操作（POST/PUT/PATCH/DELETE）且非日志/上传/查询类接口
    if (!this.shouldLog(method, path)) {
      return;
    }

    const user = request.user;
    const duration = Date.now() - startAt;
    const action = this.inferAction(method);
    const module = this.inferModule(path);
    const statusCode = this.getStatusCode(response, error);
    const sanitizedBody = this.sanitizeBody(request.body);

    try {
      await this.prisma.operationLog.create({
        data: {
          userId: this.getNumericUserId(user),
          username: user?.username,
          module,
          action,
          targetId: request.params?.id?.toString(),
          targetType: module,
          description: `${method} ${path}`,
          method,
          path,
          ip: request.ip,
          userAgent: request.headers?.['user-agent'],
          statusCode,
          duration,
          requestBody: this.stringifyForLog(sanitizedBody),
          newValue: sanitizedBody,
          response: error ? undefined : this.stringifyForLog(responseBody),
          error: error ? this.stringifyForLog(this.normalizeError(error)) : undefined,
        },
      });
    }
    catch (logError) {
      // 日志写入失败不应影响主业务
      console.error('[OperationLog] 写入失败:', logError);
    }
  }

  private inferAction(method: string): LogAction {
    switch (method) {
      case 'POST':
        return LogAction.CREATE;
      case 'PUT':
      case 'PATCH':
        return LogAction.UPDATE;
      case 'DELETE':
        return LogAction.DELETE;
      default:
        return LogAction.OTHER;
    }
  }

  private inferModule(path: string): string {
    // 从路径前缀推断模块，如 /products → product
    const segments = this.stripApiPrefix(path).split('/').filter(Boolean);
    const raw = segments[0] || 'unknown';
    // 去尾部的 s，如 products → product
    return raw.endsWith('s') ? raw.slice(0, -1) : raw;
  }

  private shouldLog(method: string, path: string): boolean {
    // 跳过 GET、OPTIONS、HEAD
    if (['GET', 'OPTIONS', 'HEAD'].includes(method)) {
      return false;
    }
    // 跳过认证、文件、日志、健康检查等接口
    const normalizedPath = this.stripApiPrefix(path);
    const skipPatterns = [
      /^\/?auth\//,
      /^\/?files\//,
      /^\/?system-logs\//,
      /^\/?upload-records\//,
      /^\/?health/,
      /^\/?public-key/,
    ];
    if (skipPatterns.some(p => p.test(normalizedPath))) {
      return false;
    }
    return true;
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }
    // 脱敏密码等敏感字段
    const sensitive = ['password', 'token', 'secret', 'creditCard', 'idCard'];
    const result = { ...body };
    for (const key of Object.keys(result)) {
      if (sensitive.some(s => key.toLowerCase().includes(s))) {
        result[key] = '***';
      } else if (result[key] && typeof result[key] === 'object') {
        result[key] = this.sanitizeBody(result[key]);
      }
    }
    return result;
  }

  private getRequestPath(request: any): string {
    const rawPath = request.originalUrl || request.url || request.path || '';
    return rawPath.split('?')[0] || '/';
  }

  private stripApiPrefix(path: string): string {
    return path.replace(/^\/api(?=\/|$)/, '');
  }

  private getStatusCode(response: any, error?: any): number | undefined {
    if (error?.status) {
      return Number(error.status);
    }
    if (error?.statusCode) {
      return Number(error.statusCode);
    }
    return response?.statusCode;
  }

  private getNumericUserId(user: any): number | undefined {
    const rawUserId = user?.userId ?? user?.sub;

    if (typeof rawUserId === 'number' && Number.isInteger(rawUserId)) {
      return rawUserId;
    }

    if (typeof rawUserId === 'string' && /^\d+$/.test(rawUserId)) {
      const parsed = Number(rawUserId);
      return Number.isInteger(parsed) ? parsed : undefined;
    }

    return undefined;
  }

  private normalizeError(error: any): any {
    if (!error) {
      return undefined;
    }
    return {
      name: error.name,
      message: error.message,
      status: error.status ?? error.statusCode,
      response: this.sanitizeBody(error.response),
    };
  }

  private stringifyForLog(value: any): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    return text.length > 4000 ? `${text.slice(0, 4000)}...` : text;
  }
}
