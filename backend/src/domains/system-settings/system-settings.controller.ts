import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { RequirePermissions } from '@/auth/decorators/permissions.decorator';
import { SystemSettingsService } from './system-settings.service';
import { UpsertSystemSettingDto } from './dto/upsert-system-setting.dto';
import { SystemSettingVo } from './vo/system-setting.vo';

@ApiTags('后台接口/系统设置')
@Controller('system-settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class SystemSettingsController {
  constructor(private readonly systemSettingsService: SystemSettingsService) {}

  @Get()
  @RequirePermissions('system:setting:view')
  @ApiOperation({ summary: '获取系统设置列表' })
  @ApiOkResponse({ type: [SystemSettingVo] })
  findAll() {
    return this.systemSettingsService.findAll();
  }

  @Get('category/:category')
  @RequirePermissions('system:setting:view')
  @ApiOperation({ summary: '按分类获取系统设置' })
  @ApiOkResponse({ type: [SystemSettingVo] })
  findByCategory(@Param('category') category: string) {
    return this.systemSettingsService.findByCategory(category);
  }

  @Post()
  @RequirePermissions('system:setting:update')
  @ApiOperation({ summary: '新增或更新系统设置' })
  @ApiOkResponse({ type: SystemSettingVo })
  upsert(@Body() dto: UpsertSystemSettingDto) {
    return this.systemSettingsService.upsert(dto);
  }
}
