import { IsOptional, IsInt, IsString, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { LogAction } from '@prisma/client';

export class QueryOperationLogDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  pageSize?: number = 20;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  userId?: number;

  @IsOptional()
  @IsString()
  module?: string;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  statusCode?: number;

  @IsOptional()
  @IsEnum(LogAction)
  action?: LogAction;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;
}
