import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class UpsertSystemSettingDto {
  @ApiProperty({ description: '配置键', example: 'mini-program.auth' })
  @IsString()
  @MinLength(1)
  key: string;

  @ApiProperty({ description: '配置分类', example: 'mini-program' })
  @IsString()
  @MinLength(1)
  category: string;

  @ApiProperty({ description: '配置名称', example: '小程序认证配置' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({
    description: '配置内容',
    example: {
      wechatAppId: 'wx1234567890',
      wechatAppSecret: 'secret',
    },
  })
  @IsObject()
  value: Record<string, any>;

  @ApiPropertyOptional({ description: '配置说明' })
  @IsOptional()
  @IsString()
  description?: string;
}
