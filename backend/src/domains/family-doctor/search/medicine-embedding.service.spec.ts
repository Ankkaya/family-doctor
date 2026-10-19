import { MedicineEmbeddingService } from './medicine-embedding.service';

describe('real medicine embeddings', () => {
  const originalEnv = { ...process.env };
  beforeEach(() => {
    process.env.MEDICINE_EMBEDDING_BASE_URL = 'https://embedding.example/v1';
    process.env.MEDICINE_EMBEDDING_API_KEY = 'test-key';
    process.env.MEDICINE_EMBEDDING_MODEL = 'test-model';
    process.env.MEDICINE_EMBEDDING_DIMENSIONS = '2';
  });
  afterEach(() => { process.env = { ...originalEnv }; jest.restoreAllMocks(); });

  it('calls the configured model and orders batch vectors by index', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ data: [{ index: 1, embedding: [0, 1] }, { index: 0, embedding: [1, 0] }] }) } as any);
    expect(await new MedicineEmbeddingService().embedMany(['头痛', '发热'])).toEqual(['[1,0]', '[0,1]']);
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({ model: 'test-model', input: ['头痛', '发热'] });
  });

  it.each([[1], [0, 0], [NaN, 1]])('rejects invalid model vectors %j', async (...vector) => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ data: [{ index: 0, embedding: vector }] }) } as any);
    await expect(new MedicineEmbeddingService().embed('头痛')).rejects.toThrow();
  });

  it('does not fall back to hash embeddings when unconfigured', async () => {
    delete process.env.MEDICINE_EMBEDDING_API_KEY;
    await expect(new MedicineEmbeddingService().embed('头痛')).rejects.toThrow('尚未配置');
    process.env.MEDICINE_SIMILARITY_THRESHOLD = '2';
    expect(() => new MedicineEmbeddingService().threshold).toThrow();
  });
});
