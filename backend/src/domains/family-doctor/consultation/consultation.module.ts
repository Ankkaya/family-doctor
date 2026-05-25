import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infrastructure/prisma/prisma.module';
import { AgentClientModule } from '../agent-client/agent-client.module';
import { CabinetModule } from '../cabinet/cabinet.module';
import { HouseholdsModule } from '@/domains/households/households.module';
import { ConsultationController } from './consultation.controller';
import { ConsultationService } from './consultation.service';

@Module({
  imports: [PrismaModule, AgentClientModule, CabinetModule, HouseholdsModule],
  controllers: [ConsultationController],
  providers: [ConsultationService],
})
export class ConsultationModule {}
