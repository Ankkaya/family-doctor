import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class RunConsultationDebugDto {
  @ApiProperty({ description: '调试输入的问题文本' })
  @IsString()
  @MinLength(2)
  question!: string;

  @ApiPropertyOptional({ description: '用于读取家庭药箱全集的家庭 ID；为空时使用空药箱' })
  @IsOptional()
  @IsString()
  householdId?: string;

  @ApiPropertyOptional({ description: '用于读取用户画像的 App 用户 ID；为空时不传用户画像' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: '是否允许 Agent 推荐 RX 处方药，默认 false' })
  @IsOptional()
  @IsBoolean()
  allowRxRecommendation?: boolean;

  @ApiPropertyOptional({ description: '模拟传给 Agent 的近期历史消息' })
  @IsOptional()
  @IsArray()
  historyMessages?: Array<{
    role: 'USER' | 'ASSISTANT';
    content: string;
    createdAt?: string;
  }>;

  @ApiPropertyOptional({ description: '模拟传给 Agent 的会话摘要' })
  @IsOptional()
  @IsObject()
  sessionSummary?: Record<string, unknown>;

  @ApiPropertyOptional({ description: '模拟当前会话状态' })
  @IsOptional()
  @IsString()
  @IsIn(['active', 'resolved', 'stale', 'closed'])
  conversationStatus?: 'active' | 'resolved' | 'stale' | 'closed';
}
