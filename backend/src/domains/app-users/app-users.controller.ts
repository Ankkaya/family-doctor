import { Body, Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@/auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { AppUsersService } from './app-users.service';
import { QueryAppUserDto } from './dto/query-app-user.dto';
import { ResetAppUserPasswordDto } from './dto/reset-app-user-password.dto';
import { UpdateAppUserStatusDto } from './dto/update-app-user-status.dto';

@ApiTags('后台/App用户')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/app-users')
export class AppUsersController {
  constructor(private readonly appUsersService: AppUsersService) {}

  @Get()
  @RequirePermissions('family-doctor:app-user:view')
  @ApiOperation({ summary: '后台查询 App 用户列表' })
  list(@Query() query: QueryAppUserDto) {
    return this.appUsersService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('family-doctor:app-user:view')
  @ApiOperation({ summary: '后台查询 App 用户详情' })
  detail(@Param('id') id: string) {
    return this.appUsersService.findOne(id);
  }

  @Get(':id/households')
  @RequirePermissions('family-doctor:app-user:view')
  @ApiOperation({ summary: '后台查询 App 用户加入的家庭' })
  households(@Param('id') id: string) {
    return this.appUsersService.findHouseholds(id);
  }

  @Patch(':id/status')
  @RequirePermissions('family-doctor:app-user:update')
  @ApiOperation({ summary: '后台启用或停用 App 用户' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateAppUserStatusDto) {
    return this.appUsersService.updateStatus(id, dto.status);
  }

  @Patch(':id/password')
  @RequirePermissions('family-doctor:app-user:reset-password')
  @ApiOperation({ summary: '后台重置 App 用户密码' })
  resetPassword(@Param('id') id: string, @Body() dto: ResetAppUserPasswordDto) {
    return this.appUsersService.resetPassword(id, dto.password);
  }

  @Delete(':id')
  @RequirePermissions('family-doctor:app-user:delete')
  @ApiOperation({ summary: '后台删除 App 用户' })
  remove(@Param('id') id: string) {
    return this.appUsersService.remove(id);
  }
}
