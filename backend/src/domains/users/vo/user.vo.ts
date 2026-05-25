import { ApiProperty } from '@nestjs/swagger';
import { RoleVo } from '@/roles/vo/role.vo';

export class UserVo {
  @ApiProperty({ description: '用户ID' })
  id: number;

  @ApiProperty({ description: '用户名' })
  username: string;

  @ApiProperty({ description: '邮箱', nullable: true })
  email: string | null;

  @ApiProperty({ description: '姓名', nullable: true })
  name: string | null;

  @ApiProperty({ description: '头像地址', nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;

  static fromEntity(entity: any): UserVo {
    return {
      id: entity.id,
      username: entity.username,
      email: entity.email,
      name: entity.name,
      avatarUrl: entity.avatarUrl || null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  static fromEntities(entities: any[]): UserVo[] {
    return entities.map(e => UserVo.fromEntity(e));
  }
}

export class UserWithRolesVo extends UserVo {
  @ApiProperty({ description: '角色列表', type: [RoleVo] })
  roles: RoleVo[];

  static fromEntity(entity: any): UserWithRolesVo {
    return {
      ...UserVo.fromEntity(entity),
      roles: entity.roles ? RoleVo.fromEntities(entity.roles) : [],
    };
  }
}
