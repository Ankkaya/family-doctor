import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

export class AgUiRunAgentDto {
  @ApiProperty({ description: 'AG-UI thread id' })
  @IsString()
  threadId!: string;

  @ApiProperty({ description: 'AG-UI run id' })
  @IsString()
  runId!: string;

  @ApiPropertyOptional({ description: 'Parent run id' })
  @IsOptional()
  @IsString()
  parentRunId?: string;

  @ApiProperty({ description: 'Conversation messages' })
  @IsArray()
  messages!: Array<Record<string, unknown>>;

  @ApiProperty({ description: 'Shared AG-UI state' })
  @IsObject()
  state!: Record<string, unknown>;

  @ApiProperty({ description: 'Client-provided tools' })
  @IsArray()
  tools!: Array<Record<string, unknown>>;

  @ApiProperty({ description: 'Client context values' })
  @IsArray()
  context!: Array<Record<string, unknown>>;

  @ApiProperty({ description: 'Additional forwarded props' })
  @IsObject()
  forwardedProps!: Record<string, unknown>;
}
