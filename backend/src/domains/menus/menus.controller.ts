import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MenusService } from './menus.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { BatchIdsDto } from '@/common/dto/batch-ids.dto';

@ApiTags('后台接口/菜单管理')
@Controller('menus')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class MenusController {
  constructor(private readonly menusService: MenusService) {}

  @Post()
  @RequirePermissions('system:menu:create')
  @ApiOperation({ summary: '创建菜单' })
  create(@Body() createMenuDto: CreateMenuDto) {
    return this.menusService.create(createMenuDto);
  }

  @Get()
  @RequirePermissions('system:menu:view')
  @ApiQuery({ name: 'format', required: false, enum: ['tree', 'flat'], description: '返回格式：tree-树形(默认), flat-扁平列表' })
  @ApiOperation({ summary: '获取菜单列表' })
  findAll(@Query('format') format?: string) {
    if (format === 'flat') {
      return this.menusService.findAllFlat();
    }
    return this.menusService.findAll();
  }

  @Get(':id')
  @RequirePermissions('system:menu:view')
  @ApiOperation({ summary: '根据ID获取菜单详情' })
  findOne(@Param('id') id: string) {
    return this.menusService.findOne(+id);
  }

  @Patch(':id')
  @RequirePermissions('system:menu:update')
  @ApiOperation({ summary: '更新菜单' })
  update(@Param('id') id: string, @Body() updateMenuDto: UpdateMenuDto) {
    return this.menusService.update(+id, updateMenuDto);
  }

  @Delete('batch')
  @RequirePermissions('system:menu:batch-delete')
  @ApiOperation({ summary: '批量删除菜单' })
  removeMany(@Body() dto: BatchIdsDto) {
    return this.menusService.removeMany(dto.ids);
  }

  @Delete(':id')
  @RequirePermissions('system:menu:delete')
  @ApiOperation({ summary: '删除菜单' })
  remove(@Param('id') id: string) {
    return this.menusService.remove(+id);
  }
}
