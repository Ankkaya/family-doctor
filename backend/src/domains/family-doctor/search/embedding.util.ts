import { createHash } from 'crypto';

const EMBEDDING_DIMENSIONS = 384;

export function buildSearchText(input: {
  name?: string | null;
  aliases?: string[] | null;
  indication?: string | null;
  contraindication?: string | null;
  adverseReaction?: string | null;
  dosage?: string | null;
  notes?: string | null;
}) {
  return [
    input.name,
    ...(input.aliases ?? []),
    input.indication,
    input.contraindication,
    input.adverseReaction,
    input.dosage,
    input.notes,
  ]
    .filter((item): item is string => Boolean(item?.trim()))
    .join(' ');
}

export function buildDeterministicEmbeddingText(text: string) {
  const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  const tokens = tokenize(text);

  for (const token of tokens) {
    const hash = createHash('sha256').update(token).digest();
    const index = hash.readUInt16BE(0) % EMBEDDING_DIMENSIONS;
    const sign = hash[2] % 2 === 0 ? 1 : -1;
    vector[index] += sign;
  }

  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  const normalized = vector.map((value) => Number((value / norm).toFixed(6)));
  return `[${normalized.join(',')}]`;
}

function tokenize(text: string) {
  const normalized = text
    .toLowerCase()
    .replace(/[，。！？、；：,.!?;:()[\]{}"'`~@#$%^&*_+=|\\/<>-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = normalized.split(' ').filter(Boolean);
  const cjkChars = Array.from(normalized).filter((char) => /[\u4e00-\u9fff]/u.test(char));

  return [...words, ...cjkChars].filter(Boolean);
}
