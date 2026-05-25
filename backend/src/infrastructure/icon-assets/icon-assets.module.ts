import { Module } from '@nestjs/common';
import { MinioModule } from '@/infrastructure/minio/minio.module';
import { IconAssetsService } from './icon-assets.service';

@Module({
  imports: [MinioModule],
  providers: [IconAssetsService],
  exports: [IconAssetsService],
})
export class IconAssetsModule {}
