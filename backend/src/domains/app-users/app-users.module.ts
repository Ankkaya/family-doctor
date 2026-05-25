import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infrastructure/prisma/prisma.module';
import { AppUsersController } from './app-users.controller';
import { AppUsersService } from './app-users.service';

@Module({
  imports: [PrismaModule],
  controllers: [AppUsersController],
  providers: [AppUsersService],
})
export class AppUsersModule {}
