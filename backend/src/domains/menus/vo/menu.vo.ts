import { ApiProperty } from '@nestjs/swagger';

export class MenuVo {
  @ApiProperty({ description: '菜单ID' })
  id: number;

  @ApiProperty({ description: '菜单名称' })
  name: string;

  @ApiProperty({ description: '路由路径', nullable: true })
  path: string | null;

  @ApiProperty({ description: '图标', nullable: true })
  icon: string | null;

  @ApiProperty({ description: '图标 URL', nullable: true })
  iconUrl?: string | null;

  @ApiProperty({ description: '组件路径', nullable: true })
  component: string | null;

  @ApiProperty({ description: '重定向地址', nullable: true })
  redirect: string | null;

  @ApiProperty({ description: '权限标识', nullable: true })
  permission: string | null;

  @ApiProperty({ description: '父级ID', nullable: true })
  parentId: number | null;

  @ApiProperty({ description: '排序' })
  order: number;

  @ApiProperty({ description: '是否隐藏' })
  hidden: boolean;

  @ApiProperty({ description: '类型' })
  type: string;

  @ApiProperty({ description: '子菜单', type: [MenuVo], nullable: true })
  children?: MenuVo[];

  static fromEntity(entity: any): MenuVo {
    const vo: MenuVo = {
      id: entity.id,
      name: entity.name,
      path: entity.path,
      icon: entity.icon,
      iconUrl: entity.iconUrl ?? null,
      component: entity.component,
      redirect: entity.redirect,
      permission: entity.permission,
      parentId: entity.parentId,
      order: entity.order,
      hidden: entity.hidden,
      type: entity.type,
    };

    if (entity.children && entity.children.length > 0) {
      vo.children = MenuVo.fromEntities(entity.children);
    }

    return vo;
  }

  static fromEntities(entities: any[]): MenuVo[] {
    return entities.map(e => MenuVo.fromEntity(e));
  }
}
