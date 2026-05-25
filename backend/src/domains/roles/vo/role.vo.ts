import { ApiProperty } from '@nestjs/swagger';
import { MenuVo } from '@/menus/vo/menu.vo';

export class RoleVo {
  @ApiProperty({ description: '角色ID' })
  id: number;

  @ApiProperty({ description: '角色名称' })
  name: string;

  @ApiProperty({ description: '角色编码' })
  code: string;

  @ApiProperty({ description: '角色描述', nullable: true })
  description: string | null;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;

  static fromEntity(entity: any): RoleVo {
    return {
      id: entity.id,
      name: entity.name,
      code: entity.code,
      description: entity.description,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  static fromEntities(entities: any[]): RoleVo[] {
    return entities.map(e => RoleVo.fromEntity(e));
  }
}

export class RoleWithMenusVo extends RoleVo {
  @ApiProperty({ description: '菜单列表', type: [MenuVo] })
  menus: MenuVo[];

  static fromEntity(entity: any): RoleWithMenusVo {
    return {
      ...RoleVo.fromEntity(entity),
      menus: entity.menus ? MenuVo.fromEntities(entity.menus) : [],
    };
  }
}
