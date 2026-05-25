import { ApiProperty } from '@nestjs/swagger';

export class SystemSettingVo {
  @ApiProperty({ description: '配置ID' })
  id: number;

  @ApiProperty({ description: '配置键' })
  key: string;

  @ApiProperty({ description: '配置分类' })
  category: string;

  @ApiProperty({ description: '配置名称' })
  name: string;

  @ApiProperty({ description: '配置内容' })
  value: Record<string, any>;

  @ApiProperty({ description: '配置说明', nullable: true })
  description: string | null;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;

  static fromEntity(entity: any): SystemSettingVo {
    return {
      id: entity.id,
      key: entity.key,
      category: entity.category,
      name: entity.name,
      value: entity.value || {},
      description: entity.description,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  static fromEntities(entities: any[]): SystemSettingVo[] {
    return entities.map(entity => SystemSettingVo.fromEntity(entity));
  }
}
