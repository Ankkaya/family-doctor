import { Module } from '@nestjs/common';
import { TencentCloudApiService } from './tencent-cloud-api.service';
import { TencentAsrService } from './tencent-asr.service';
import { TencentTtsService } from './tencent-tts.service';
import { VoiceController } from './voice.controller';

@Module({
  controllers: [VoiceController],
  providers: [TencentCloudApiService, TencentAsrService, TencentTtsService],
  exports: [TencentTtsService],
})
export class VoiceModule {}
