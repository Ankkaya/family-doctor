import { BadRequestException, Injectable } from '@nestjs/common';
import { BufferedFile } from '@/infrastructure/minio/dto/file.dto';
import { TencentCloudApiService } from './tencent-cloud-api.service';
import { SpeechTranscriptionResult } from './voice.types';

type SentenceRecognitionResponse = {
  Response?: {
    Result?: string;
    AudioDuration?: number;
    RequestId?: string;
  };
};

const MIME_TO_TENCENT_FORMAT: Record<string, string> = {
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/amr': 'amr',
  'audio/ogg': 'ogg-opus',
  'audio/opus': 'ogg-opus',
};

@Injectable()
export class TencentAsrService {
  private static readonly MAX_AUDIO_BYTES = 10 * 1024 * 1024;

  constructor(private readonly tencentApi: TencentCloudApiService) {}

  async transcribe(file: BufferedFile): Promise<SpeechTranscriptionResult> {
    this.validateAudioFile(file);

    const voiceFormat = this.resolveVoiceFormat(file);
    const response = await this.tencentApi.call<SentenceRecognitionResponse>({
      service: 'asr',
      host: 'asr.tencentcloudapi.com',
      action: 'SentenceRecognition',
      version: '2019-06-14',
      region: process.env.TENCENT_ASR_REGION || 'ap-shanghai',
      payload: {
        ProjectId: Number(process.env.TENCENT_ASR_PROJECT_ID || 0),
        SubServiceType: 2,
        EngSerViceType: process.env.TENCENT_ASR_ENGINE || '16k_zh',
        SourceType: 1,
        VoiceFormat: voiceFormat,
        UsrAudioKey: `${Date.now()}-${file.originalname || 'recording'}`,
        Data: file.buffer.toString('base64'),
        DataLen: file.buffer.length,
        FilterDirty: 0,
        FilterModal: 0,
        FilterPunc: 0,
        ConvertNumMode: 1,
        WordInfo: 0,
      },
    });

    const text = response.Response?.Result?.trim();
    if (!text) {
      throw new BadRequestException('未识别到有效语音内容');
    }

    return {
      text,
      provider: 'tencent',
      durationMs: response.Response?.AudioDuration
        ? Math.round(response.Response.AudioDuration * 1000)
        : undefined,
    };
  }

  private validateAudioFile(file?: BufferedFile) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('请上传录音文件');
    }

    if (file.size > TencentAsrService.MAX_AUDIO_BYTES) {
      throw new BadRequestException('录音文件过大，请控制在 10MB 以内');
    }

    if (!this.resolveVoiceFormat(file)) {
      throw new BadRequestException('录音格式暂不支持，请使用 WAV、MP3、M4A、AAC、AMR 或 OGG/Opus');
    }
  }

  private resolveVoiceFormat(file: BufferedFile) {
    const mimeType = file.mimetype?.split(';')[0]?.toLowerCase();
    if (mimeType && MIME_TO_TENCENT_FORMAT[mimeType]) {
      return MIME_TO_TENCENT_FORMAT[mimeType];
    }

    const ext = file.originalname?.split('.').pop()?.toLowerCase();
    if (ext === 'wav' || ext === 'mp3' || ext === 'm4a' || ext === 'aac' || ext === 'amr') {
      return ext;
    }
    if (ext === 'ogg' || ext === 'opus') {
      return 'ogg-opus';
    }

    return '';
  }
}
