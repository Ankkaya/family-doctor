import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { AgentConsultInput, AgentConsultOutput } from './agent-client.types';

@Injectable()
export class AgentClientService {
  private readonly logger = new Logger(AgentClientService.name);

  async consult(input: AgentConsultInput): Promise<AgentConsultOutput> {
    const baseUrl = (process.env.AGENT_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
    const timeoutMs = Number(process.env.AGENT_TIMEOUT_MS || 30000);
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

      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Agent 服务调用失败: ${message}`);
      throw new BadGatewayException(`Agent 服务不可用: ${message}`);
    } finally {
      clearTimeout(timer);
    }
  }
}
