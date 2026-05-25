import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryAdminCabinetDto {
  @ApiPropertyOptional({ description: '家庭 ID' })
  @IsOptional()
  @IsString()
  householdId?: string;

  @ApiPropertyOptional({ description: 'App 用户 ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: '家庭、药品或适应症关键字' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ enum: ['expired', 'expiring', 'valid', 'unknown'] })
  @IsOptional()
  @IsIn(['expired', 'expiring', 'valid', 'unknown'])
  expireStatus?: 'expired' | 'expiring' | 'valid' | 'unknown';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
