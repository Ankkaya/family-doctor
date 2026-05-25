import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class AskConsultationDto {
  @ApiPropertyOptional({ description: '已有会话 ID；为空时后端创建新会话' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiProperty({ description: '用户症状描述' })
  @IsString()
  @MinLength(2)
  question!: string;

  @ApiPropertyOptional({ description: '是否允许 Agent 推荐 RX 处方药，默认 false' })
  @IsOptional()
  @IsBoolean()
  allowRxRecommendation?: boolean;
}
