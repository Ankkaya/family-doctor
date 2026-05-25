import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { LogAction, LoginLogType } from '@prisma/client';
import { QueryOperationLogDto } from './dto/query-operation-log.dto';
import { QueryLoginLogDto } from './dto/query-login-log.dto';

@Injectable()
export class SystemLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOperationLogs(query: QueryOperationLogDto) {
    const { page = 1, pageSize = 20, userId, module, method, path, statusCode, action, startTime, endTime } = query;
    const where: any = {};
    if (userId) where.userId = userId;
    if (module) where.module = module;
    if (method) where.method = method;
    if (path) where.path = { contains: path };
    if (statusCode) where.statusCode = statusCode;
    if (action) where.action = action as LogAction;
    if (startTime || endTime) {
      where.createdAt = {};
      if (startTime) where.createdAt.gte = new Date(startTime);
      if (endTime) where.createdAt.lte = new Date(endTime);
    }

    const [list, total] = await Promise.all([
      this.prisma.operationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.operationLog.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  async findLoginLogs(query: QueryLoginLogDto) {
    const { page = 1, pageSize = 20, userId, type, startTime, endTime, success } = query;
    const where: any = {};
    if (userId) where.userId = userId;
    if (type) where.type = type as LoginLogType;
    if (success !== undefined) where.success = success;
    if (startTime || endTime) {
      where.createdAt = {};
      if (startTime) where.createdAt.gte = new Date(startTime);
      if (endTime) where.createdAt.lte = new Date(endTime);
    }

    const [list, total] = await Promise.all([
      this.prisma.loginLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.loginLog.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  async createOperationLog(data: {
    userId?: number;
    username?: string;
    module: string;
    action: LogAction;
    targetId?: string;
    targetType?: string;
    description?: string;
    oldValue?: any;
    newValue?: any;
    ip?: string;
    userAgent?: string;
    duration?: number;
  }) {
    return this.prisma.operationLog.create({
      data: {
        ...data,
        oldValue: data.oldValue ?? undefined,
        newValue: data.newValue ?? undefined,
      },
    });
  }

  async createLoginLog(data: {
    userId?: number;
    username?: string;
    type: LoginLogType;
    ip: string;
    userAgent?: string;
    success: boolean;
    message?: string;
  }) {
    return this.prisma.loginLog.create({ data });
  }
}
