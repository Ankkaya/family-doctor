import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsIn,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMenuDto {
  @ApiProperty({
    example: '系统管理',
    description: '菜单名称，用于显示在侧边栏或面包屑中',
  })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiPropertyOptional({
    example: '/system',
    description: '路由路径，对应前端vue文件的path',
  })
  @IsString()
  @IsOptional()
  path?: string;

  @ApiPropertyOptional({
    example: 'setting',
    description: '菜单图标，对应Element Plus或IconPark图标名称',
  })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({
    example: 'layout/System/index',
    description: '前端组件路径，相对于views或pages目录的路径',
  })
  @IsString()
  @IsOptional()
  component?: string;

  @ApiPropertyOptional({
    example: '',
    description: '重定向地址，当访问该菜单时自动跳转到指定地址',
  })
  @IsString()
  @IsOptional()
  redirect?: string;

  @ApiPropertyOptional({
    example: 'system:user:view',
    description: '权限标识，用于后端接口和前端按钮权限判断',
  })
  @IsString()
  @IsOptional()
  permission?: string;

  @ApiPropertyOptional({
    example: 1,
    description: '父级菜单ID，指定该菜单的上级菜单，创建子菜单时使用',
  })
  @IsNumber()
  @IsOptional()
  parentId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: '排序号，数字越小越靠前显示，用于菜单排序',
  })
  @IsNumber()
  @IsOptional()
  order?: number;

  @ApiPropertyOptional({
    example: false,
    description: '是否隐藏该菜单，不在侧边栏显示但仍可访问',
  })
  @IsBoolean()
  @IsOptional()
  hidden?: boolean;

  @ApiPropertyOptional({
    example: 'menu',
    enum: ['menu', 'button', 'iframe'],
    description: '菜单类型：menu-菜单、button-按钮、iframe-外链',
  })
  @IsString()
  @IsIn(['menu', 'button', 'iframe'])
  @IsOptional()
  type?: string;
}
