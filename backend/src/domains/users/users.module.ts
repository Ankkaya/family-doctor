import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { IconAssetsModule } from '@/infrastructure/icon-assets/icon-assets.module';

@Module({
  imports: [IconAssetsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
