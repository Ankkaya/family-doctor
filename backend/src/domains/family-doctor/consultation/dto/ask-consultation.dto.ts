import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsObject, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AskConsultationAudioDto {
  @ApiPropertyOptional({ description: '是否返回语音播报事件' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '音频编码', enum: ['mp3', 'wav'] })
  @IsOptional()
  @IsIn(['mp3', 'wav'])
  codec?: 'mp3' | 'wav';
}

export class AskConsultationDto {
  @ApiPropertyOptional({ description: '已有会话 ID；为空时后端创建新会话' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sessionId?: string;

  @ApiProperty({ description: '用户症状描述' })
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  question!: string;

  @ApiPropertyOptional({ description: '是否允许 Agent 推荐 RX 处方药，默认 false' })
  @IsOptional()
  @IsBoolean()
  allowRxRecommendation?: boolean;

  @ApiPropertyOptional({ description: '语音播报配置' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AskConsultationAudioDto)
  audio?: AskConsultationAudioDto;
}
