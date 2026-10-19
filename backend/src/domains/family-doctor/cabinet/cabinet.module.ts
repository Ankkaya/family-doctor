import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infrastructure/prisma/prisma.module';
import { HouseholdsModule } from '@/domains/households/households.module';
import { CabinetController } from './cabinet.controller';
import { CabinetService } from './cabinet.service';
import { MedicineEmbeddingService } from '../search/medicine-embedding.service';

@Module({
  imports: [PrismaModule, HouseholdsModule],
  controllers: [CabinetController],
  providers: [CabinetService, MedicineEmbeddingService],
  exports: [CabinetService],
})
export class CabinetModule {}
