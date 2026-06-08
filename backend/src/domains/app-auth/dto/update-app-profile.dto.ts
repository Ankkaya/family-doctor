import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateAppProfileDto {
  @ApiPropertyOptional({ description: '头像 URL' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  avatarUrl?: string;

  @ApiPropertyOptional({ description: '年龄', minimum: 0, maximum: 130 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(130)
  age?: number;

  @ApiPropertyOptional({ description: '性别', enum: ['male', 'female', 'other', 'unknown'] })
  @IsOptional()
  @IsString()
  @IsIn(['male', 'female', 'other', 'unknown'])
  gender?: string;

  @ApiPropertyOptional({ description: '过敏史' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  allergies?: string;

  @ApiPropertyOptional({ description: '基础病' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  chronicDiseases?: string;

  @ApiPropertyOptional({ description: '长期用药' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  medicationHistory?: string;
}
