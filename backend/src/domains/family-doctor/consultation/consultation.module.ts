import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infrastructure/prisma/prisma.module';
import { AgentClientModule } from '../agent-client/agent-client.module';
import { CabinetModule } from '../cabinet/cabinet.module';
import { HouseholdsModule } from '@/domains/households/households.module';
import { VoiceModule } from '../voice/voice.module';
import { ConsultationController } from './consultation.controller';
import { ConsultationService } from './consultation.service';
import { ConsultationAudioStreamerService } from './consultation-audio-streamer.service';

@Module({
  imports: [PrismaModule, AgentClientModule, CabinetModule, VoiceModule, HouseholdsModule],
  controllers: [ConsultationController],
  providers: [ConsultationService, ConsultationAudioStreamerService],
})
export class ConsultationModule {}
