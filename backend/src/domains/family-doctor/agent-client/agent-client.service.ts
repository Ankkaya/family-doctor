import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import {
  AgentConsultInput,
  AgentConsultOutput,
  AgentConsultStreamEvent,
  AgentAgUiEvent,
  AgentAgUiRunInput,
  AgentRecognizeMedicineImageInput,
  AgentRecognizeMedicineImageOutput,
} from './agent-client.types';

@Injectable()
export class AgentClientService {
  private readonly logger = new Logger(AgentClientService.name);

  private getBaseUrl() {
    return (process.env.AGENT_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
  }

  private getTimeoutMs() {
    return Number(process.env.AGENT_TIMEOUT_MS || 30000);
  }

  private getErrorMessage(error: unknown, timeoutMs: number) {
    if (error instanceof Error && error.name === 'AbortError') {
      return `Agent 调用超时（${timeoutMs}ms）`;
    }

    return error instanceof Error ? error.message : String(error);
  }

  async consult(input: AgentConsultInput): Promise<AgentConsultOutput> {
    const baseUrl = this.getBaseUrl();
    const timeoutMs = this.getTimeoutMs();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}/agent/consult`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new BadGatewayException(`Agent 服务返回异常: HTTP ${response.status} ${text}`);
      }

      return await response.json() as AgentConsultOutput;
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      const message = this.getErrorMessage(error, timeoutMs);
      this.logger.error(`Agent 服务调用失败: ${message}`);
      throw new BadGatewayException(`Agent 服务不可用: ${message}`);
    } finally {
      clearTimeout(timer);
    }
  }

  async recognizeMedicineImages(input: AgentRecognizeMedicineImageInput): Promise<AgentRecognizeMedicineImageOutput> {
    const baseUrl = this.getBaseUrl();
    const timeoutMs = this.getTimeoutMs();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}/agent/medicine/recognize-images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new BadGatewayException(`Agent 图片识别服务返回异常: HTTP ${response.status} ${text}`);
      }

      return await response.json() as AgentRecognizeMedicineImageOutput;
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      const message = this.getErrorMessage(error, timeoutMs);
      this.logger.error(`Agent 图片识别调用失败: ${message}`);
      throw new BadGatewayException(`图片识别服务不可用: ${message}`);
    } finally {
      clearTimeout(timer);
    }
  }

  async consultStream(
    input: AgentConsultInput,
    onEvent: (event: AgentConsultStreamEvent) => Promise<void> | void,
  ): Promise<AgentConsultOutput> {
    try {
      return await this.consumeAgentStream(input, onEvent);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Agent 流式调用失败，回退到普通调用: ${message}`);
      await onEvent({ type: 'status', stage: 'fallback', message: '正在整理问诊结果' });
      const output = await this.consult(input);
      await onEvent({
        type: 'complete',
        ...output,
      });
      return output;
    }
  }

  async agUiStream(
    input: AgentAgUiRunInput,
    onEvent: (event: AgentAgUiEvent) => Promise<void> | void,
  ): Promise<AgentConsultOutput> {
    const baseUrl = this.getBaseUrl();
    const timeoutMs = this.getTimeoutMs();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}/agent/ag-ui`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(input),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new BadGatewayException(`Agent AG-UI 服务返回异常: HTTP ${response.status} ${text}`);
      }

      if (!response.body) {
        throw new BadGatewayException('Agent AG-UI 服务未返回可读数据流');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let completed: AgentConsultOutput | null = null;

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

        const chunks = buffer.split(/\r?\n\r?\n/);
        buffer = chunks.pop() ?? '';

        for (const rawChunk of chunks) {
          const event = this.parseSseEvent(rawChunk);
          if (!event) continue;

          await onEvent(event);
          if (event.type === 'RUN_FINISHED') {
            completed = this.toAgentOutputFromAgUi(event);
          }
        }

        if (done) {
          break;
        }
      }

      const finalEvent = this.parseSseEvent(buffer.trim());
      if (finalEvent) {
        await onEvent(finalEvent);
        if (finalEvent.type === 'RUN_FINISHED') {
          completed = this.toAgentOutputFromAgUi(finalEvent);
        }
      }

      if (!completed) {
        throw new BadGatewayException('Agent AG-UI 服务未返回完成事件');
      }

      return completed;
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      const message = this.getErrorMessage(error, timeoutMs);
      this.logger.error(`Agent AG-UI 调用失败: ${message}`);
      throw new BadGatewayException(`Agent AG-UI 服务不可用: ${message}`);
    } finally {
      clearTimeout(timer);
    }
  }

  private async consumeAgentStream(
    input: AgentConsultInput,
    onEvent: (event: AgentConsultStreamEvent) => Promise<void> | void,
  ) {
    const baseUrl = this.getBaseUrl();
    const timeoutMs = this.getTimeoutMs();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}/agent/consult/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/x-ndjson',
        },
        body: JSON.stringify(input),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new BadGatewayException(`Agent 流式服务返回异常: HTTP ${response.status} ${text}`);
      }

      if (!response.body) {
        throw new BadGatewayException('Agent 流式服务未返回可读数据流');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let completed: AgentConsultOutput | null = null;

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line) continue;

          const event = JSON.parse(line) as AgentConsultStreamEvent;
          await onEvent(event);

          if (event.type === 'complete') {
            completed = {
              answer: event.answer,
              recommends: event.recommends,
              disclaimer: event.disclaimer,
              traces: event.traces,
            };
          }
        }

        if (done) {
          break;
        }
      }

      if (!completed && buffer.trim()) {
        const event = JSON.parse(buffer.trim()) as AgentConsultStreamEvent;
        await onEvent(event);
        if (event.type === 'complete') {
          completed = {
            answer: event.answer,
            recommends: event.recommends,
            disclaimer: event.disclaimer,
            traces: event.traces,
          };
        }
      }

      if (!completed) {
        throw new BadGatewayException('Agent 流式服务未返回完成事件');
      }

      return completed;
    } finally {
      clearTimeout(timer);
    }
  }

  private parseSseEvent(rawChunk: string): AgentAgUiEvent | null {
    const data = rawChunk
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n')
      .trim();

    return data ? JSON.parse(data) as AgentAgUiEvent : null;
  }

  private toAgentOutputFromAgUi(event: AgentAgUiEvent): AgentConsultOutput {
    if (event.type !== 'RUN_FINISHED') {
      throw new BadGatewayException('AG-UI 事件不是完成事件');
    }

    const result = (event.result ?? {}) as Partial<AgentConsultOutput>;
    return {
      answer: typeof result.answer === 'string' ? result.answer : '',
      recommends: Array.isArray(result.recommends) ? result.recommends : [],
      disclaimer: typeof result.disclaimer === 'string' ? result.disclaimer : '',
      traces: Array.isArray(result.traces) ? result.traces : [],
    };
  }
}
