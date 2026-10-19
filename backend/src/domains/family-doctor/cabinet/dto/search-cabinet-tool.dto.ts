import { ArrayMaxSize, IsArray, IsIn, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SearchCabinetToolDto {
  @ApiProperty({ description: '后端签发的短期会话权限凭证', maxLength: 4096 })
  @IsString()
  @MaxLength(4096)
  scope!: string;

  @ApiProperty({ enum: ['name', 'symptom', 'inventory'] })
  @IsIn(['name', 'symptom', 'inventory'])
  mode!: 'name' | 'symptom' | 'inventory';

  @ApiProperty({ type: [String], maxItems: 10, description: '完整药名/别名；症状查询传空数组' })
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  names!: string[];

  @ApiProperty({ maxLength: 1000, description: '症状检索文本；药名查询传空字符串' })
  @IsString()
  @MaxLength(1000)
  symptoms!: string;
}
