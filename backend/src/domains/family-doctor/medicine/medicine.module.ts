import { Module } from '@nestjs/common';
import { AgentClientModule } from '../agent-client/agent-client.module';
import { MedicineController } from './medicine.controller';
import { MedicineService } from './medicine.service';

@Module({
  imports: [AgentClientModule],
  controllers: [MedicineController],
  providers: [MedicineService],
  exports: [MedicineService],
})
export class MedicineModule {}
