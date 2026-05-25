import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './domains/auth/auth.module';
import { AppAuthModule } from './domains/app-auth/app-auth.module';
import { AppUsersModule } from './domains/app-users/app-users.module';
import { DictionariesModule } from './domains/dictionaries/dictionaries.module';
import { HouseholdsModule } from './domains/households/households.module';
import { MenusModule } from './domains/menus/menus.module';
import { RolesModule } from './domains/roles/roles.module';
import { SystemLogsModule } from './domains/system-logs/system-logs.module';
import { SystemSettingsModule } from './domains/system-settings/system-settings.module';
import { UploadRecordsModule } from './domains/upload-records/upload-records.module';
import { UsersModule } from './domains/users/users.module';
import { FamilyDoctorModule } from './domains/family-doctor/family-doctor.module';
import { IconAssetsModule } from './infrastructure/icon-assets/icon-assets.module';
import { MinioModule } from './infrastructure/minio/minio.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    MinioModule,
    IconAssetsModule,
    AuthModule,
    AppAuthModule,
    AppUsersModule,
    HouseholdsModule,
    DictionariesModule,
    UsersModule,
    RolesModule,
    MenusModule,
    SystemSettingsModule,
    SystemLogsModule,
    UploadRecordsModule,
    FamilyDoctorModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
