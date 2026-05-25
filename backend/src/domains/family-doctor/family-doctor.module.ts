import { Module } from '@nestjs/common';
import { AgentClientModule } from './agent-client/agent-client.module';
import { CabinetModule } from './cabinet/cabinet.module';
import { ConsultationModule } from './consultation/consultation.module';
import { MedicineModule } from './medicine/medicine.module';

@Module({
  imports: [AgentClientModule, MedicineModule, CabinetModule, ConsultationModule],
})
export class FamilyDoctorModule {}
