import { Injectable, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class MedicineEmbeddingService {
  get modelKey() {
    return `${process.env.MEDICINE_EMBEDDING_BASE_URL || ''}|${process.env.MEDICINE_EMBEDDING_MODEL || ''}|${this.dimensions}`;
  }

  get dimensions() {
    const value = Number(process.env.MEDICINE_EMBEDDING_DIMENSIONS || 1024);
    if (!Number.isInteger(value) || value < 1 || value > 16000) throw new ServiceUnavailableException('Embedding 维度配置无效');
    return value;
  }

  get threshold() {
    const value = Number(process.env.MEDICINE_SIMILARITY_THRESHOLD || 0.65);
    if (!Number.isFinite(value) || value < -1 || value > 1) throw new ServiceUnavailableException('药箱相似度阈值配置无效');
    return value;
  }

  async embed(text: string): Promise<string> {
    return (await this.embedMany([text]))[0];
  }

  async embedMany(texts: string[]): Promise<string[]> {
    const baseUrl = process.env.MEDICINE_EMBEDDING_BASE_URL?.replace(/\/$/, '');
    const model = process.env.MEDICINE_EMBEDDING_MODEL;
    const key = process.env.MEDICINE_EMBEDDING_API_KEY;
    if (!baseUrl || !model || !key) throw new ServiceUnavailableException('药箱语义检索尚未配置 Embedding 服务');
    try {
      const response = await fetch(`${baseUrl}/embeddings`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, input: texts }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error('Embedding request failed');
      const data = await response.json() as { data?: { index: number; embedding?: number[] }[] };
      if (!Array.isArray(data.data) || data.data.length !== texts.length) throw new Error('Invalid embedding count');
      return data.data.sort((a, b) => a.index - b.index).map((item, index) => {
        const vector = item.embedding;
        if (item.index !== index || !Array.isArray(vector) || vector.length !== this.dimensions || !vector.every(v => typeof v === 'number' && Number.isFinite(v)) || !vector.some(v => v !== 0)) throw new Error('Invalid embedding');
        return `[${vector.join(',')}]`;
      });
    } catch {
      throw new ServiceUnavailableException('药箱 Embedding 服务不可用');
    }
  }
}
