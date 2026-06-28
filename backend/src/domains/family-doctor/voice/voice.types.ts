export type SpeechTranscriptionResult = {
  text: string;
  provider: 'tencent';
  durationMs?: number;
};

export type TtsSynthesisInput = {
  text: string;
  codec?: 'mp3' | 'wav';
};

export type TtsSynthesisResult = {
  audioBase64: string;
  codec: 'mp3' | 'wav';
  sampleRate: number;
};
