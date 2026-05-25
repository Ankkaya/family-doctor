import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { BatchIdsDto } from '@/common/dto/batch-ids.dto';

@ApiTags('后台接口/用户管理')
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermissions('system:user:create')
  @ApiOperation({ summary: '创建用户' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @RequirePermissions('system:user:view')
  @ApiOperation({ summary: '获取用户列表' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get('me')
  @ApiOperation({ summary: '获取当前登录用户信息' })
  getCurrentUser(@Request() req) {
    return this.usersService.findById(req.user.userId);
  }

  @Get(':id')
  @RequirePermissions('system:user:view')
  @ApiOperation({ summary: '根据ID获取用户详情' })
  findOne(@Param('id') id: string) {
    return this.usersService.findById(+id);
  }

  @Patch(':id')
  @RequirePermissions('system:user:update')
  @ApiOperation({ summary: '更新用户信息' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Patch(':id/password')
  @RequirePermissions('system:user:update')
  @ApiOperation({ summary: '重置用户密码' })
  resetPassword(@Param('id') id: string, @Body() resetUserPasswordDto: ResetUserPasswordDto) {
    return this.usersService.resetPassword(+id, resetUserPasswordDto.password);
  }

  @Delete('batch')
  @RequirePermissions('system:user:batch-delete')
  @ApiOperation({ summary: '批量删除用户' })
  removeMany(@Body() dto: BatchIdsDto) {
    return this.usersService.removeMany(dto.ids);
  }

  @Delete(':id')
  @RequirePermissions('system:user:delete')
  @ApiOperation({ summary: '删除用户' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }

  // 子资源：用户-角色
  @Get(':id/roles')
  @RequirePermissions('system:user:view')
  @ApiOperation({ summary: '获取用户的角色列表' })
  getUserRoles(@Param('id') id: string) {
    return this.usersService.getUserRoles(+id);
  }

  @Patch(':id/roles')
  @RequirePermissions('system:user:assign-roles')
  @ApiOperation({ summary: '为用户分配角色' })
  assignRoles(
    @Param('id') id: string,
    @Body() body: { roleIds: number[] },
  ) {
    return this.usersService.assignRoles(+id, body.roleIds);
  }

  // 子资源：用户-菜单（聚合查询）
  @Get(':id/menus')
  @ApiQuery({ name: 'format', required: false, enum: ['tree', 'flat'], description: '返回格式：tree-树形(默认), flat-扁平' })
  @ApiOperation({ summary: '获取用户的菜单（聚合所有角色的菜单）' })
  getUserMenus(@Param('id') id: string, @Query('format') format?: string) {
    return this.usersService.getUserMenus(+id, format);
  }
}
