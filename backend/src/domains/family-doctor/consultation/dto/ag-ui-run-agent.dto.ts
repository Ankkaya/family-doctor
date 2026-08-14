import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class AgUiRunAgentDto {
  @ApiProperty({ description: 'AG-UI thread id' })
  @IsString()
  @MaxLength(100)
  threadId!: string;

  @ApiProperty({ description: 'AG-UI run id' })
  @IsString()
  @MaxLength(100)
  runId!: string;

  @ApiPropertyOptional({ description: 'Parent run id' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  parentRunId?: string;

  @ApiProperty({ description: 'Conversation messages' })
  @IsArray()
  @ArrayMaxSize(50)
  messages!: Array<Record<string, unknown>>;

  @ApiProperty({ description: 'Shared AG-UI state' })
  @IsObject()
  state!: Record<string, unknown>;

  @ApiProperty({ description: 'Client-provided tools' })
  @IsArray()
  @ArrayMaxSize(20)
  tools!: Array<Record<string, unknown>>;

  @ApiProperty({ description: 'Client context values' })
  @IsArray()
  @ArrayMaxSize(20)
  context!: Array<Record<string, unknown>>;

  @ApiProperty({ description: 'Additional forwarded props' })
  @IsObject()
  forwardedProps!: Record<string, unknown>;
}
