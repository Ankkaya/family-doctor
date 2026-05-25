import { IsString, IsOptional, IsArray, IsNumber, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({
    example: '管理员',
    description: '角色名称，用于显示',
  })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({
    example: 'admin',
    description: '角色编码，唯一标识符，用于权限判断',
  })
  @IsString()
  @MinLength(2)
  code: string;

  @ApiPropertyOptional({
    example: '超级管理员',
    description: '角色描述，说明角色的职责和权限范围',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: [1, 2, 3],
    description: '关联的菜单ID数组，定义该角色可以访问的菜单',
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  menuIds?: number[];
}
