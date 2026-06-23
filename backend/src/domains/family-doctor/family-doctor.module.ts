import { Module } from '@nestjs/common';
import { AgentClientModule } from './agent-client/agent-client.module';
import { CabinetModule } from './cabinet/cabinet.module';
import { ConsultationModule } from './consultation/consultation.module';
import { MedicineModule } from './medicine/medicine.module';
import { RemindersModule } from './reminders/reminders.module';

@Module({
  imports: [AgentClientModule, MedicineModule, CabinetModule, ConsultationModule, RemindersModule],
})
export class FamilyDoctorModule {}
