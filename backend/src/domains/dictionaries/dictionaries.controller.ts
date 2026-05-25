import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@/auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { CreateDictionaryItemDto } from './dto/create-dictionary-item.dto';
import { CreateDictionaryTypeDto } from './dto/create-dictionary-type.dto';
import { QueryDictionaryItemDto } from './dto/query-dictionary-item.dto';
import { QueryDictionaryTypeDto } from './dto/query-dictionary-type.dto';
import { UpdateDictionaryItemDto } from './dto/update-dictionary-item.dto';
import { UpdateDictionaryTypeDto } from './dto/update-dictionary-type.dto';
import { DictionariesService } from './dictionaries.service';
import { DictionaryItemVo, DictionaryTypeVo } from './vo';

@ApiTags('后台接口/字典管理')
@Controller('dictionaries')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class DictionariesController {
  constructor(private readonly dictionariesService: DictionariesService) {}

  @Post('types')
  @RequirePermissions('system:dictionary:create')
  @ApiOperation({ summary: '创建字典类型' })
  @ApiOkResponse({ type: DictionaryTypeVo })
  createType(@Body() dto: CreateDictionaryTypeDto) {
    return this.dictionariesService.createType(dto);
  }

  @Get('types')
  @RequirePermissions('system:dictionary:view')
  @ApiOperation({ summary: '查询字典类型列表' })
  findTypes(@Query() query: QueryDictionaryTypeDto) {
    return this.dictionariesService.findTypes(query);
  }

  @Get('types/:id')
  @RequirePermissions('system:dictionary:view')
  @ApiOperation({ summary: '获取字典类型详情' })
  @ApiOkResponse({ type: DictionaryTypeVo })
  findType(@Param('id') id: string) {
    return this.dictionariesService.findType(+id);
  }

  @Patch('types/:id')
  @RequirePermissions('system:dictionary:update')
  @ApiOperation({ summary: '更新字典类型' })
  @ApiOkResponse({ type: DictionaryTypeVo })
  updateType(@Param('id') id: string, @Body() dto: UpdateDictionaryTypeDto) {
    return this.dictionariesService.updateType(+id, dto);
  }

  @Delete('types/:id')
  @RequirePermissions('system:dictionary:delete')
  @ApiOperation({ summary: '删除字典类型' })
  @ApiOkResponse({ type: DictionaryTypeVo })
  removeType(@Param('id') id: string) {
    return this.dictionariesService.removeType(+id);
  }

  @Get('types/:id/items')
  @RequirePermissions('system:dictionary:view')
  @ApiOperation({ summary: '查询字典类型下的字典项' })
  @ApiOkResponse({ type: [DictionaryItemVo] })
  findItemsByType(@Param('id') id: string, @Query() query: QueryDictionaryItemDto) {
    return this.dictionariesService.findItemsByType(+id, query);
  }

  @Get('code/:code/items')
  @RequirePermissions('system:dictionary:view')
  @ApiOperation({ summary: '按字典编码查询可用字典项' })
  @ApiOkResponse({ type: [DictionaryItemVo] })
  findItemsByTypeCode(@Param('code') code: string, @Query() query: QueryDictionaryItemDto) {
    return this.dictionariesService.findItemsByTypeCode(code, query);
  }

  @Post('items')
  @RequirePermissions('system:dictionary:item:create')
  @ApiOperation({ summary: '创建字典项' })
  @ApiOkResponse({ type: DictionaryItemVo })
  createItem(@Body() dto: CreateDictionaryItemDto) {
    return this.dictionariesService.createItem(dto);
  }

  @Patch('items/:id')
  @RequirePermissions('system:dictionary:item:update')
  @ApiOperation({ summary: '更新字典项' })
  @ApiOkResponse({ type: DictionaryItemVo })
  updateItem(@Param('id') id: string, @Body() dto: UpdateDictionaryItemDto) {
    return this.dictionariesService.updateItem(+id, dto);
  }

  @Delete('items/:id')
  @RequirePermissions('system:dictionary:item:delete')
  @ApiOperation({ summary: '删除字典项' })
  @ApiOkResponse({ type: DictionaryItemVo })
  removeItem(@Param('id') id: string) {
    return this.dictionariesService.removeItem(+id);
  }
}
