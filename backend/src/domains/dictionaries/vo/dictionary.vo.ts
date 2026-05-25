import { ApiProperty } from '@nestjs/swagger';

export class DictionaryTypeVo {
  @ApiProperty({ description: '字典类型ID' })
  id: number;

  @ApiProperty({ description: '字典名称' })
  name: string;

  @ApiProperty({ description: '字典编码' })
  code: string;

  @ApiProperty({ description: '字典说明', nullable: true })
  description: string | null;

  @ApiProperty({ description: '是否启用' })
  isEnabled: boolean;

  @ApiProperty({ description: '排序号' })
  sort: number;

  @ApiProperty({ description: '字典项数量', required: false })
  itemCount?: number;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;

  static fromEntity(entity: any): DictionaryTypeVo {
    return {
      id: entity.id,
      name: entity.name,
      code: entity.code,
      description: entity.description,
      isEnabled: entity.isEnabled,
      sort: entity.sort,
      itemCount: entity._count?.items,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  static fromEntities(entities: any[]): DictionaryTypeVo[] {
    return entities.map(entity => DictionaryTypeVo.fromEntity(entity));
  }
}

export class DictionaryItemVo {
  @ApiProperty({ description: '字典项ID' })
  id: number;

  @ApiProperty({ description: '所属字典类型ID' })
  typeId: number;

  @ApiProperty({ description: '字典项标签' })
  label: string;

  @ApiProperty({ description: '字典项值' })
  value: string;

  @ApiProperty({ description: '展示颜色', nullable: true })
  color: string | null;

  @ApiProperty({ description: '是否启用' })
  isEnabled: boolean;

  @ApiProperty({ description: '排序号' })
  sort: number;

  @ApiProperty({ description: '备注', nullable: true })
  remark: string | null;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;

  static fromEntity(entity: any): DictionaryItemVo {
    return {
      id: entity.id,
      typeId: entity.typeId,
      label: entity.label,
      value: entity.value,
      color: entity.color,
      isEnabled: entity.isEnabled,
      sort: entity.sort,
      remark: entity.remark,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  static fromEntities(entities: any[]): DictionaryItemVo[] {
    return entities.map(entity => DictionaryItemVo.fromEntity(entity));
  }
}
