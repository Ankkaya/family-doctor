import { Injectable } from '@nestjs/common';
import { TencentCloudApiService } from './tencent-cloud-api.service';
import { TtsSynthesisInput, TtsSynthesisResult } from './voice.types';

type TextToVoiceResponse = {
  Response?: {
    Audio?: string;
    RequestId?: string;
    SessionId?: string;
  };
};

@Injectable()
export class TencentTtsService {
  constructor(private readonly tencentApi: TencentCloudApiService) {}

  async synthesize(input: TtsSynthesisInput): Promise<TtsSynthesisResult> {
    const codec = input.codec || this.getCodec();
    const sampleRate = Number(process.env.TENCENT_TTS_SAMPLE_RATE || 16000);
    const response = await this.tencentApi.call<TextToVoiceResponse>({
      service: 'tts',
      host: 'tts.tencentcloudapi.com',
      action: 'TextToVoice',
      version: '2019-08-23',
      region: process.env.TENCENT_TTS_REGION || 'ap-shanghai',
      payload: {
        Text: input.text,
        SessionId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        ModelType: Number(process.env.TENCENT_TTS_MODEL_TYPE || 1),
        VoiceType: Number(process.env.TENCENT_TTS_VOICE_TYPE || 101001),
        Codec: codec,
        SampleRate: sampleRate,
        Speed: Number(process.env.TENCENT_TTS_SPEED || 0),
        Volume: Number(process.env.TENCENT_TTS_VOLUME || 0),
        EnableSubtitle: false,
      },
    });

    return {
      audioBase64: response.Response?.Audio || '',
      codec,
      sampleRate,
    };
  }

  private getCodec(): 'mp3' | 'wav' {
    return process.env.TENCENT_TTS_CODEC === 'wav' ? 'wav' : 'mp3';
  }
}
