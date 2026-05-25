import { Controller, Delete, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@/auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { HouseholdsService } from './households.service';
import { QueryHouseholdDto } from './dto/query-household.dto';

@ApiTags('后台/家庭')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('family-doctor:household:view')
@Controller('admin/households')
export class AdminHouseholdsController {
  constructor(private readonly householdsService: HouseholdsService) {}

  @Get()
  @ApiOperation({ summary: '后台查询家庭列表' })
  list(@Query() query: QueryHouseholdDto) {
    return this.householdsService.findAdminHouseholds(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '后台查询家庭详情' })
  detail(@Param('id') id: string) {
    return this.householdsService.findAdminHousehold(id);
  }

  @Get(':id/members')
  @ApiOperation({ summary: '后台查询家庭成员' })
  members(@Param('id') id: string) {
    return this.householdsService.listMembers(id);
  }

  @Delete(':id')
  @RequirePermissions('family-doctor:household:delete')
  @ApiOperation({ summary: '后台删除家庭' })
  remove(@Param('id') id: string) {
    return this.householdsService.removeAdminHousehold(id);
  }
}
