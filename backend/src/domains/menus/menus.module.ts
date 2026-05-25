import { Module } from '@nestjs/common';
import { MenusService } from './menus.service';
import { MenusController } from './menus.controller';
import { IconAssetsModule } from '@/infrastructure/icon-assets/icon-assets.module';

@Module({
  imports: [IconAssetsModule],
  controllers: [MenusController],
  providers: [MenusService],
  exports: [MenusService],
})
export class MenusModule {}
