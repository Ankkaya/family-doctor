import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateCronJobExecutionDto {
  @ApiProperty({ enum: ['success', 'failed', 'skipped'] })
  @IsIn(['success', 'failed', 'skipped'])
  status!: 'success' | 'failed' | 'skipped';

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  startedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  finishedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  result?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  errorMessage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dedupeKey?: string;
}
