import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsISO8601, IsObject, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateCronJobDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty()
  @IsString()
  householdId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  memberId?: string;

  @ApiProperty({ enum: ['cron', 'every', 'at'] })
  @IsIn(['cron', 'every', 'at'])
  type!: 'cron' | 'every' | 'at';

  @ApiProperty({ enum: ['medicine', 'temperature', 'cabinet'] })
  @IsIn(['medicine', 'temperature', 'cabinet'])
  taskType!: 'medicine' | 'temperature' | 'cabinet';

  @ApiProperty()
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiPropertyOptional({ enum: ['enabled', 'disabled', 'expired'] })
  @IsOptional()
  @IsIn(['enabled', 'disabled', 'expired'])
  status?: 'enabled' | 'disabled' | 'expired';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cronExpression?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(60)
  everySeconds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  runAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: ['user_agent', 'system'] })
  @IsOptional()
  @IsIn(['user_agent', 'system'])
  source?: 'user_agent' | 'system';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  nextRunAt?: string;
}
