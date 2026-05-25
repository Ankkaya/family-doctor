import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { CreateDictionaryItemDto } from './dto/create-dictionary-item.dto';
import { CreateDictionaryTypeDto } from './dto/create-dictionary-type.dto';
import { QueryDictionaryItemDto } from './dto/query-dictionary-item.dto';
import { QueryDictionaryTypeDto } from './dto/query-dictionary-type.dto';
import { UpdateDictionaryItemDto } from './dto/update-dictionary-item.dto';
import { UpdateDictionaryTypeDto } from './dto/update-dictionary-type.dto';
import { DictionaryItemVo, DictionaryTypeVo } from './vo';

@Injectable()
export class DictionariesService {
  constructor(private readonly prisma: PrismaService) {}

  async createType(dto: CreateDictionaryTypeDto) {
    const code = dto.code.trim();
    const existingType = await this.prisma.dictionaryType.findUnique({
      where: { code },
    });

    if (existingType) {
      throw new ConflictException('字典编码已存在');
    }

    const type = await this.prisma.dictionaryType.create({
      data: {
        name: dto.name.trim(),
        code,
        description: dto.description?.trim() || null,
        isEnabled: dto.isEnabled ?? true,
        sort: dto.sort ?? 0,
      },
    });

    return DictionaryTypeVo.fromEntity(type);
  }

  async findTypes(query: QueryDictionaryTypeDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const keyword = query.keyword?.trim();
    const where: any = { deletedAt: null };

    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { code: { contains: keyword } },
      ];
    }
    if (query.isEnabled !== undefined) {
      where.isEnabled = query.isEnabled;
    }

    const [list, total] = await Promise.all([
      this.prisma.dictionaryType.findMany({
        where,
        include: {
          _count: {
            select: { items: { where: { deletedAt: null } } },
          },
        },
        orderBy: [{ sort: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.dictionaryType.count({ where }),
    ]);

    return {
      list: DictionaryTypeVo.fromEntities(list),
      total,
      page,
      pageSize,
    };
  }

  async findType(id: number) {
    const type = await this.prisma.dictionaryType.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: { items: { where: { deletedAt: null } } },
        },
      },
    });

    if (!type) {
      throw new NotFoundException('字典类型不存在');
    }

    return DictionaryTypeVo.fromEntity(type);
  }

  async updateType(id: number, dto: UpdateDictionaryTypeDto) {
    const existingType = await this.prisma.dictionaryType.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existingType) {
      throw new NotFoundException('字典类型不存在');
    }

    if (dto.code && dto.code.trim() !== existingType.code) {
      const duplicateType = await this.prisma.dictionaryType.findFirst({
        where: {
          code: dto.code.trim(),
          NOT: { id },
        },
      });

      if (duplicateType) {
        throw new ConflictException('字典编码已存在');
      }
    }

    const type = await this.prisma.dictionaryType.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.code !== undefined ? { code: dto.code.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.isEnabled !== undefined ? { isEnabled: dto.isEnabled } : {}),
        ...(dto.sort !== undefined ? { sort: dto.sort } : {}),
      },
    });

    return DictionaryTypeVo.fromEntity(type);
  }

  async removeType(id: number) {
    const type = await this.prisma.dictionaryType.findFirst({
      where: { id, deletedAt: null },
    });

    if (!type) {
      throw new NotFoundException('字典类型不存在');
    }

    const activeItemCount = await this.prisma.dictionaryItem.count({
      where: { typeId: id, deletedAt: null },
    });

    if (activeItemCount > 0) {
      throw new BadRequestException('请先删除该字典类型下的字典项');
    }

    await this.prisma.dictionaryType.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return DictionaryTypeVo.fromEntity(type);
  }

  async createItem(dto: CreateDictionaryItemDto) {
    await this.ensureActiveType(dto.typeId);
    await this.ensureUniqueItemValue(dto.typeId, dto.value);

    const item = await this.prisma.dictionaryItem.create({
      data: {
        typeId: dto.typeId,
        label: dto.label.trim(),
        value: dto.value.trim(),
        color: dto.color?.trim() || null,
        isEnabled: dto.isEnabled ?? true,
        sort: dto.sort ?? 0,
        remark: dto.remark?.trim() || null,
      },
    });

    return DictionaryItemVo.fromEntity(item);
  }

  async findItemsByType(typeId: number, query: QueryDictionaryItemDto) {
    await this.ensureActiveType(typeId);
    return this.findItems({ ...query, typeId });
  }

  async findItemsByTypeCode(code: string, query: QueryDictionaryItemDto) {
    const type = await this.prisma.dictionaryType.findFirst({
      where: { code, deletedAt: null, isEnabled: true },
    });

    if (!type) {
      throw new NotFoundException('字典类型不存在或已停用');
    }

    return this.findItems({ ...query, typeId: type.id, enabledTypeOnly: true });
  }

  async updateItem(id: number, dto: UpdateDictionaryItemDto) {
    const existingItem = await this.prisma.dictionaryItem.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existingItem) {
      throw new NotFoundException('字典项不存在');
    }

    const nextTypeId = dto.typeId ?? existingItem.typeId;
    const nextValue = dto.value?.trim() ?? existingItem.value;
    await this.ensureActiveType(nextTypeId);
    await this.ensureUniqueItemValue(nextTypeId, nextValue, id);

    const item = await this.prisma.dictionaryItem.update({
      where: { id },
      data: this.normalizeItemData(dto, existingItem),
    });

    return DictionaryItemVo.fromEntity(item);
  }

  async removeItem(id: number) {
    const item = await this.prisma.dictionaryItem.findFirst({
      where: { id, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException('字典项不存在');
    }

    await this.prisma.dictionaryItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return DictionaryItemVo.fromEntity(item);
  }

  private async findItems(query: QueryDictionaryItemDto & { typeId: number; enabledTypeOnly?: boolean }) {
    const keyword = query.keyword?.trim();
    const where: any = {
      typeId: query.typeId,
      deletedAt: null,
    };

    if (query.enabledTypeOnly) {
      where.type = { isEnabled: true, deletedAt: null };
      where.isEnabled = true;
    }
    if (keyword) {
      where.OR = [
        { label: { contains: keyword } },
        { value: { contains: keyword } },
      ];
    }
    if (query.isEnabled !== undefined) {
      where.isEnabled = query.isEnabled;
    }

    const list = await this.prisma.dictionaryItem.findMany({
      where,
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
    });

    return DictionaryItemVo.fromEntities(list);
  }

  private async ensureActiveType(typeId: number) {
    const type = await this.prisma.dictionaryType.findFirst({
      where: { id: typeId, deletedAt: null },
    });

    if (!type) {
      throw new NotFoundException('字典类型不存在');
    }

    return type;
  }

  private async ensureUniqueItemValue(typeId: number, value: string, excludeId?: number) {
    const duplicateItem = await this.prisma.dictionaryItem.findFirst({
      where: {
        typeId,
        value: value.trim(),
        deletedAt: null,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });

    if (duplicateItem) {
      throw new ConflictException('同一字典类型下字典项值不能重复');
    }
  }

  private normalizeItemData(dto: CreateDictionaryItemDto | UpdateDictionaryItemDto, existingItem?: { typeId: number }) {
    return {
      ...(dto.typeId !== undefined ? { typeId: dto.typeId } : existingItem ? { typeId: existingItem.typeId } : {}),
      ...(dto.label !== undefined ? { label: dto.label.trim() } : {}),
      ...(dto.value !== undefined ? { value: dto.value.trim() } : {}),
      ...(dto.color !== undefined ? { color: dto.color?.trim() || null } : {}),
      ...(dto.isEnabled !== undefined ? { isEnabled: dto.isEnabled } : {}),
      ...(dto.sort !== undefined ? { sort: dto.sort } : {}),
      ...(dto.remark !== undefined ? { remark: dto.remark?.trim() || null } : {}),
    };
  }
}
