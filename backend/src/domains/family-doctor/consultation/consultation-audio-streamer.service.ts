import { Injectable } from '@nestjs/common';
import { EventType } from '@ag-ui/core';
import { TencentTtsService } from '../voice/tencent-tts.service';
import type { AgentAgUiEvent } from '../agent-client/agent-client.types';
import type { ConsultationStreamEvent } from './consultation.service';

type AudioCodec = 'mp3' | 'wav';
type AudioStreamer = {
  push: (delta: string) => void;
  finish: () => Promise<void>;
};

@Injectable()
export class ConsultationAudioStreamerService {
  constructor(private readonly ttsService: TencentTtsService) {}

  createStandard(
    codec: AudioCodec,
    onEvent: (event: ConsultationStreamEvent) => Promise<void> | void,
  ): AudioStreamer {
    return this.create(codec, {
      metadata: (audio) => onEvent({ type: 'audio_meta', ...audio }),
      chunk: (chunk) => onEvent({ type: 'audio_chunk', ...chunk }),
      done: () => onEvent({ type: 'audio_done' }),
      error: (message) => onEvent({ type: 'audio_error', message }),
    });
  }

  createAgUi(
    codec: AudioCodec,
    onEvent: (event: AgentAgUiEvent) => Promise<void> | void,
  ): AudioStreamer {
    const emit = (name: string, value: Record<string, unknown>) => onEvent({
      type: EventType.CUSTOM,
      name,
      value,
    });
    return this.create(codec, {
      metadata: (audio) => emit('consultation.audio_meta', { type: 'audio_meta', ...audio }),
      chunk: (chunk) => emit('consultation.audio_chunk', { type: 'audio_chunk', ...chunk }),
      done: () => emit('consultation.audio_done', { type: 'audio_done' }),
      error: (message) => emit('consultation.audio_error', { type: 'audio_error', message }),
    });
  }

  private create(
    codec: AudioCodec,
    emitters: {
      metadata: (audio: { codec: AudioCodec; sampleRate: number }) => Promise<void> | void;
      chunk: (chunk: { seq: number; text: string; audioBase64: string; codec: AudioCodec }) => Promise<void> | void;
      done: () => Promise<void> | void;
      error: (message: string) => Promise<void> | void;
    },
  ): AudioStreamer {
    let pendingText = '';
    let sequence = 0;
    let metadataSent = false;
    let chain = Promise.resolve();
    let failed = false;

    const enqueue = (text: string) => {
      const normalized = text.replace(/\s+/g, ' ').trim();
      if (!normalized || failed) return;

      chain = chain.then(async () => {
        try {
          const audio = await this.ttsService.synthesize({ text: normalized, codec });
          if (!audio.audioBase64) return;
          if (!metadataSent) {
            metadataSent = true;
            await emitters.metadata({ codec: audio.codec, sampleRate: audio.sampleRate });
          }
          sequence += 1;
          await emitters.chunk({
            seq: sequence,
            text: normalized,
            audioBase64: audio.audioBase64,
            codec: audio.codec,
          });
        } catch (error) {
          failed = true;
          await emitters.error(error instanceof Error ? error.message : '语音合成失败');
        }
      });
    };

    return {
      push: (delta) => {
        pendingText += delta;
        const { ready, rest } = this.extractSpeakableSentences(pendingText);
        pendingText = rest;
        ready.forEach(enqueue);
      },
      finish: async () => {
        const rest = pendingText.trim();
        pendingText = '';
        if (rest) enqueue(rest);
        await chain;
        if (!failed && metadataSent) await emitters.done();
      },
    };
  }

  private extractSpeakableSentences(text: string) {
    const ready: string[] = [];
    let start = 0;
    for (let index = 0; index < text.length; index += 1) {
      const sentenceLength = index - start + 1;
      if (/[。！？!?；;]/.test(text[index]) || sentenceLength >= 80) {
        const sentence = text.slice(start, index + 1).trim();
        if (sentence) ready.push(sentence);
        start = index + 1;
      }
    }
    return { ready, rest: text.slice(start) };
  }
}
