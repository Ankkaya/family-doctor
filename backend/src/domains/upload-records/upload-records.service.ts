import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { QueryUploadRecordDto } from './dto/query-upload-record.dto';

@Injectable()
export class UploadRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryUploadRecordDto) {
    const { page = 1, pageSize = 20, userId, module, refId, status } = query;
    const where: any = {};
    if (userId) where.userId = userId;
    if (module) where.module = module;
    if (refId) where.refId = refId;
    if (status) where.status = status;

    const [list, total] = await Promise.all([
      this.prisma.uploadRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.uploadRecord.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  async create(data: {
    userId?: number;
    originalName: string;
    storedName: string;
    objectKey: string;
    url: string;
    mimeType: string;
    size: number;
    module: string;
    refId?: string;
    refType?: string;
  }) {
    return this.prisma.uploadRecord.create({ data });
  }
}
