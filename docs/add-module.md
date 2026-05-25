# 如何添加业务模块

本文档以添加一个「品牌管理」模块为例，演示从零新增一个完整 CRUD 模块的全部步骤。

预计耗时：15-30 分钟。

---

## 0. 推荐：生成模块骨架

先在项目根目录生成后端/前端基础文件：

```bash
pnpm generate:module -- --name brands --title 品牌管理 --permission system:brand --route /system/brands
```

参数说明：

| 参数 | 说明 | 示例 |
|---|---|---|
| `--name` | 复数 kebab-case 模块名，也是默认 API 资源名 | `brands` |
| `--title` | 管理后台显示名称 | `品牌管理` |
| `--permission` | 权限码前缀 | `system:brand` |
| `--route` | 前端路由路径 | `/system/brands` |
| `--api-path` | 后端接口路径，默认等于 `--name` | `brands` |
| `--model` | Prisma model 名称覆盖，默认由 `--name` 推导 | `Brand` |
| `--dry-run` | 只预览将生成的文件，不写入磁盘 | - |
| `--force` | 覆盖已有生成文件 | - |

生成器会创建：

- `backend/src/domains/brands/` 下的 module/controller/service/dto/vo 基础结构
- `frontend/src/api/brands.ts`
- `frontend/src/types/brands.ts`
- `frontend/src/types/api/brands.api.ts`
- `frontend/src/views/brands/index.vue`

生成器不会自动修改 Prisma schema、`app.module.ts`、`main.ts`、前端 router 或菜单 seed。执行完成后按下面步骤补齐这些注册点，避免脚手架误写业务字段或覆盖已有系统结构。

---

## 1. 数据库：添加 Model

编辑 `backend/prisma/schema.prisma`，添加：

```prisma
model Brand {
  id          Int       @id @default(autoincrement())
  name        String    @unique
  logo        String?
  description String?
  sort        Int       @default(0)
  isEnabled   Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime? // 软删除

  @@index([deletedAt])
}
```

运行迁移：

```bash
cd backend
pnpm prisma migrate dev --name add_brands
pnpm prisma:generate
```

---

## 2. 后端：创建模块

在 `backend/src/domains/` 下创建目录结构：

```
brands/
├── brands.module.ts
├── brands.controller.ts
├── brands.service.ts
├── dto/
│   ├── create-brand.dto.ts
│   ├── update-brand.dto.ts
│   └── query-brand.dto.ts
└── vo/
    └── brand.vo.ts
```

### brands.module.ts

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infrastructure/prisma/prisma.module';
import { BrandsService } from './brands.service';
import { BrandsController } from './brands.controller';

@Module({
  imports: [PrismaModule],
  controllers: [BrandsController],
  providers: [BrandsService],
  exports: [BrandsService],
})
export class BrandsModule {}
```

### dto/create-brand.dto.ts

```typescript
import { IsString, IsOptional, IsInt, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBrandDto {
  @ApiProperty({ description: '品牌名称' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '品牌 Logo URL' })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiPropertyOptional({ description: '品牌描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '排序', default: 0 })
  @IsOptional()
  @IsInt()
  sort?: number;

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
```

### brands.service.ts（核心模式）

```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateBrandDto) {
    // 唯一性校验
    const existing = await this.prisma.brand.findFirst({
      where: { name: dto.name, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException('品牌名称已存在');
    }

    return this.prisma.brand.create({ data: dto });
  }

  async findAll(query: { keyword?: string; page?: number; pageSize?: number }) {
    const { keyword, page = 1, pageSize = 20 } = query;
    const where = {
      deletedAt: null,
      ...(keyword ? { name: { contains: keyword } } : {}),
    };

    const [list, total] = await Promise.all([
      this.prisma.brand.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ sort: 'asc' }, { id: 'desc' }],
      }),
      this.prisma.brand.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  async findOne(id: number) {
    const brand = await this.prisma.brand.findFirst({
      where: { id, deletedAt: null },
    });
    if (!brand) throw new NotFoundException('品牌不存在');
    return brand;
  }

  async update(id: number, dto: UpdateBrandDto) {
    await this.findOne(id); // 确保存在
    return this.prisma.brand.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id); // 确保存在
    // 软删除
    return this.prisma.brand.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
```

### brands.controller.ts

```typescript
import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@ApiTags('品牌管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Post()
  @ApiOperation({ summary: '创建品牌' })
  create(@Body() dto: CreateBrandDto) {
    return this.brandsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '品牌列表' })
  findAll(@Query() query: any) {
    return this.brandsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '品牌详情' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.brandsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新品牌' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBrandDto) {
    return this.brandsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除品牌' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.brandsService.remove(id);
  }
}
```

---

## 3. 注册模块

编辑 `backend/src/app.module.ts`：

```typescript
import { BrandsModule } from './domains/brands/brands.module';

@Module({
  imports: [
    // ... 已有模块
    BrandsModule,  // ← 添加
  ],
})
export class AppModule {}
```

如果需要在 Swagger 文档中显示，编辑 `main.ts` 的 `include` 数组：

```typescript
import { BrandsModule } from './domains/brands/brands.module';

// ...
const document = SwaggerModule.createDocument(app, config, {
  include: [
    // ... 已有模块
    BrandsModule,  // ← 添加
  ],
});
```

---

## 4. 前端：添加 API

创建 `frontend/src/api/brand.ts`：

```typescript
import request from './request';

export interface Brand {
  id: number;
  name: string;
  logo?: string;
  description?: string;
  sort: number;
  isEnabled: boolean;
  createdAt: string;
}

export function getBrandList(params?: any) {
  return request.get('/brands', { params });
}

export function getBrandDetail(id: number) {
  return request.get(`/brands/${id}`);
}

export function createBrand(data: Partial<Brand>) {
  return request.post('/brands', data);
}

export function updateBrand(id: number, data: Partial<Brand>) {
  return request.patch(`/brands/${id}`, data);
}

export function deleteBrand(id: number) {
  return request.delete(`/brands/${id}`);
}
```

---

## 5. 前端：添加页面

创建 `frontend/src/views/brands/index.vue`，参考已有的 `views/system/users/index.vue` 的列表 + 弹窗模式。

核心结构：
- `NDataTable` 列表
- `NModal` + `NForm` 新增/编辑弹窗
- `NPopconfirm` 删除确认
- 搜索栏 + 分页

---

## 6. 注册菜单

通过管理后台「菜单管理」页面添加：

| 字段 | 值 |
|---|---|
| 菜单名称 | 品牌管理 |
| 路由路径 | /brands |
| 组件路径 | views/brands/index |
| 图标 | material-symbols:bookmark-outline |
| 上级菜单 | （根据你的业务分组选择） |

或者在 `seed.ts` 中添加：

```typescript
await prisma.menu.create({
  data: {
    name: '品牌管理',
    path: '/brands',
    icon: 'material-symbols:bookmark-outline',
    component: 'views/brands/index',
    parentId: parentMenuId,
    order: 1,
    type: 'menu',
  },
});
```

---

## 7. 前端路由

前端使用**动态路由**，菜单表的 `component` 字段会自动映射到 `views/` 下的组件。

确保你的 `router/` 配置中有对应的动态 import 映射。通常在 `router/dynamic.ts` 或类似文件中：

```typescript
const modules = import.meta.glob('../views/**/index.vue');
```

如果使用了这种 glob 模式，新增的 `views/brands/index.vue` 会自动被发现，无需手动注册路由。

---

## 关键模式总结

| 模式 | 说明 |
|---|---|
| 软删除 | `deletedAt` 字段 + 查询时 `where: { deletedAt: null }` |
| 唯一性校验 | service 层 `findFirst` 检查 + `ConflictException` |
| 分页 | `skip/take` + 返回 `{ list, total, page, pageSize }` |
| 认证 | Controller 加 `@UseGuards(JwtAuthGuard)` |
| Swagger | `@ApiTags` + `@ApiOperation` + `@ApiBearerAuth` |
| DTO 校验 | `class-validator` 装饰器，全局 `ValidationPipe` 自动生效 |
| 文件上传 | 使用 `MinioService` 上传，存 objectKey 到数据库 |
| 图标 | 菜单/分类的 icon 字段存 Iconify 格式（如 `material-symbols:xxx`） |

---

## 常见问题

**Q: 新增模块后 Prisma 报错？**
运行 `pnpm prisma:generate` 重新生成 client。

**Q: 前端页面加了但看不到？**
检查菜单表是否添加了对应菜单项，且当前用户的角色已分配该菜单。

**Q: 需要跨模块调用怎么办？**
在目标模块的 `module.ts` 中 `exports: [XxxService]`，在调用方的 `module.ts` 中 `imports: [XxxModule]`。
