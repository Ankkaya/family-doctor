import { BadGatewayException } from '@nestjs/common';
import { AgentClientService } from './agent-client.service';

describe('AgentClientService authentication', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.AGENT_INTERNAL_TOKEN;
  });

  it('sends the internal token to Agent requests', async () => {
    process.env.AGENT_INTERNAL_TOKEN = 'test-agent-token';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        answer: 'ok',
        recommends: [],
        disclaimer: 'test',
        traces: [],
      }),
    }) as any;
    const service = new AgentClientService();

    await service.consult({ sessionId: 's1', question: '头痛怎么办' } as any);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/agent/consult'),
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Agent-Token': 'test-agent-token' }),
      }),
    );
  });

  it('fails closed when the internal token is missing', async () => {
    global.fetch = jest.fn() as any;
    const service = new AgentClientService();

    await expect(service.consult({ sessionId: 's1', question: '头痛怎么办' } as any))
      .rejects.toBeInstanceOf(BadGatewayException);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
