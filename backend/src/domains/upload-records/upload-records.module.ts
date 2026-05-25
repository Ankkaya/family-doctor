import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infrastructure/prisma/prisma.module';
import { UploadRecordsController } from './upload-records.controller';
import { UploadRecordsService } from './upload-records.service';

@Module({
  imports: [PrismaModule],
  controllers: [UploadRecordsController],
  providers: [UploadRecordsService],
  exports: [UploadRecordsService],
})
export class UploadRecordsModule {}
