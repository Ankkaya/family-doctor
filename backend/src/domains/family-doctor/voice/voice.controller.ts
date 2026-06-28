import { Controller, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppJwtAuthGuard } from '@/domains/app-auth/guards/app-jwt-auth.guard';
import { BufferedFile } from '@/infrastructure/minio/dto/file.dto';
import { TencentAsrService } from './tencent-asr.service';

type AppRequest = {
  user: {
    appUserId: string;
  };
};

@ApiTags('家庭医生/语音')
@Controller()
export class VoiceController {
  constructor(private readonly asrService: TencentAsrService) {}

  @Post('consultation/asr/transcribe')
  @UseGuards(AppJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'App 上传录音并识别为文字' })
  @UseInterceptors(FileInterceptor('file'))
  transcribeAudio(
    @Req() _req: AppRequest,
    @UploadedFile() file: BufferedFile,
  ) {
    return this.asrService.transcribe(file);
  }
}
