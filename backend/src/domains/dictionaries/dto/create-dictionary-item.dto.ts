import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateDictionaryItemDto {
  @ApiProperty({ description: '所属字典类型ID', example: 1 })
  @IsInt()
  @Min(1)
  typeId: number;

  @ApiProperty({ description: '字典项标签', example: '启用' })
  @IsString()
  @MinLength(1)
  label: string;

  @ApiProperty({ description: '字典项值', example: 'enabled' })
  @IsString()
  @MinLength(1)
  value: string;

  @ApiPropertyOptional({ description: '展示颜色', example: '#18a058' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ description: '排序号', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;
}
