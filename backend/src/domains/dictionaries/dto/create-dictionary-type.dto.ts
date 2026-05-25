import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, Min, MinLength } from 'class-validator';

export class CreateDictionaryTypeDto {
  @ApiProperty({ description: '字典名称', example: '用户状态' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ description: '字典编码', example: 'user_status' })
  @IsString()
  @MinLength(2)
  @Matches(/^[a-z][a-z0-9_:-]*$/, {
    message: '字典编码只能包含小写字母、数字、下划线、冒号和短横线，且必须以字母开头',
  })
  code: string;

  @ApiPropertyOptional({ description: '字典说明' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ description: '排序号', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;
}
