import { Controller, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppJwtAuthGuard } from '@/domains/app-auth/guards/app-jwt-auth.guard';
import { BufferedFile } from '@/infrastructure/minio/dto/file.dto';
import { RateLimitService } from '@/infrastructure/redis/rate-limit.service';
import { TencentAsrService } from './tencent-asr.service';

type AppRequest = {
  user: {
    appUserId: string;
  };
};

@ApiTags('家庭医生/语音')
@Controller()
export class VoiceController {
  constructor(
    private readonly asrService: TencentAsrService,
    private readonly rateLimit: RateLimitService,
  ) {}

  @Post('consultation/asr/transcribe')
  @UseGuards(AppJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'App 上传录音并识别为文字' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async transcribeAudio(
    @Req() req: AppRequest,
    @UploadedFile() file: BufferedFile,
  ) {
    await this.rateLimit.assertWithinLimit('speech-transcription', req.user.appUserId, 30, 3600);
    return this.asrService.transcribe(file);
  }
}
