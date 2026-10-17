import { BadGatewayException } from '@nestjs/common';
import { AgentClientService } from './agent-client.service';

describe('AgentClientService AG-UI', () => {
  const originalFetch = global.fetch;
  const originalToken = process.env.AGENT_INTERNAL_TOKEN;
  const input = { threadId: 's1', runId: 'r1', messages: [], state: {}, tools: [], context: [], forwardedProps: {} };

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.AGENT_INTERNAL_TOKEN;
    else process.env.AGENT_INTERNAL_TOKEN = originalToken;
  });

  function mockEvents(events: unknown[], terminate = true) {
    const encoded = new TextEncoder().encode(events.map(event => `data: ${JSON.stringify(event)}${terminate ? '\r\n\r\n' : ''}`).join(''));
    global.fetch = jest.fn().mockResolvedValue({ ok: true, body: new ReadableStream({
      start(controller) {
        for (let offset = 0; offset < encoded.length; offset += 7) controller.enqueue(encoded.slice(offset, offset + 7));
        controller.close();
      },
    }) }) as any;
  }

  it.each([true, false])('reads the final summary and authenticates (separator=%s)', async terminate => {
    process.env.AGENT_INTERNAL_TOKEN = 'test-agent-token';
    const summary = { symptoms: ['头痛'], suggestedStatus: 'active' };
    mockEvents([{ type: 'RUN_FINISHED', threadId: 's1', runId: 'r1', result: {
      answer: '中文回复', recommends: [], disclaimer: 'test', traces: [], sessionSummary: summary,
    } }], terminate);
    const result = await new AgentClientService().agUiStream(input, () => {});
    expect(result.sessionSummary).toEqual(summary);
    expect(result.answer).toBe('中文回复');
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/agent/ag-ui'), expect.objectContaining({
      headers: expect.objectContaining({ 'X-Agent-Token': 'test-agent-token', Accept: 'text/event-stream' }),
    }));
  });

  it('fails closed without an internal token', async () => {
    delete process.env.AGENT_INTERNAL_TOKEN;
    global.fetch = jest.fn() as any;
    await expect(new AgentClientService().agUiStream(input, () => {})).rejects.toBeInstanceOf(BadGatewayException);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects RUN_ERROR without retrying another protocol', async () => {
    process.env.AGENT_INTERNAL_TOKEN = 'test-agent-token';
    mockEvents([{ type: 'RUN_ERROR', message: '模型失败' }]);
    await expect(new AgentClientService().agUiStream(input, () => {})).rejects.toThrow('模型失败');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('rejects a truncated stream without a completion event', async () => {
    process.env.AGENT_INTERNAL_TOKEN = 'test-agent-token';
    mockEvents([{ type: 'RUN_STARTED', threadId: 's1', runId: 'r1' }]);
    await expect(new AgentClientService().agUiStream(input, () => {})).rejects.toThrow('未返回完成事件');
  });
});
