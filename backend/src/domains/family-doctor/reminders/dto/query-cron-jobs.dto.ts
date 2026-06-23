import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryCronJobsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 50;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  householdId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ enum: ['enabled', 'disabled', 'expired'] })
  @IsOptional()
  @IsIn(['enabled', 'disabled', 'expired'])
  status?: 'enabled' | 'disabled' | 'expired';

  @ApiPropertyOptional({ enum: ['medicine', 'temperature', 'cabinet'] })
  @IsOptional()
  @IsIn(['medicine', 'temperature', 'cabinet'])
  taskType?: 'medicine' | 'temperature' | 'cabinet';
}
