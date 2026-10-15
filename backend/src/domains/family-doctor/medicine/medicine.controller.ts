import { BadRequestException, Controller, Post, Req, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BufferedFile } from '@/infrastructure/minio/dto/file.dto';
import { AppJwtAuthGuard } from '@/domains/app-auth/guards/app-jwt-auth.guard';
import { RateLimitService } from '@/infrastructure/redis/rate-limit.service';
import { MedicineService } from './medicine.service';

type AppRequest = {
  user: {
    appUserId: string;
  };
};

@ApiTags('家庭医生/药品识别')
@Controller()
export class MedicineController {
  private static readonly ALLOWED_IMAGE_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
  ]);

  constructor(
    private readonly medicineService: MedicineService,
    private readonly rateLimit: RateLimitService,
  ) {}

  @Post('medicine/recognize-images')
  @UseGuards(AppJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'App 识别药盒图片并提取药品信息' })
  @UseInterceptors(FilesInterceptor('files', 4, { limits: { fileSize: 8 * 1024 * 1024 } }))
  async recognizeImages(
    @Req() req: AppRequest,
    @UploadedFiles() files: BufferedFile[],
  ) {
    await this.rateLimit.assertWithinLimit('medicine-recognition', req.user.appUserId, 10, 3600);
    this.validateRecognitionFiles(files);
    return this.medicineService.recognizeFromImages(files);
  }

  private validateRecognitionFiles(files?: BufferedFile[]) {
    if (!files?.length) {
      throw new BadRequestException('请至少上传一张药品图片');
    }

    files.forEach((file) => {
      if (!MedicineController.ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
        throw new BadRequestException('药品图片仅支持 JPG、PNG、WEBP、GIF、AVIF 格式');
      }
      if (file.size > 8 * 1024 * 1024) {
        throw new BadRequestException('单张药品图片不能超过 8MB');
      }
    });
  }
}
