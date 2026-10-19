import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, Headers, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { verifyCabinetScope } from './cabinet-tool-scope';
import { SearchCabinetToolDto } from './dto/search-cabinet-tool.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@/auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { AppJwtAuthGuard } from '@/domains/app-auth/guards/app-jwt-auth.guard';
import { HouseholdsService } from '@/domains/households/households.service';
import { CabinetService } from './cabinet.service';
import { CreateCabinetInventoryDto } from './dto/create-cabinet-inventory.dto';
import { QueryAdminCabinetDto } from './dto/query-admin-cabinet.dto';
import { QueryCabinetDto } from './dto/query-cabinet.dto';
import { UpdateCabinetInventoryDto } from './dto/update-cabinet-inventory.dto';

type AppRequest = {
  user: {
    appUserId: string;
  };
};

@ApiTags('家庭医生/家庭药箱')
@Controller()
export class CabinetController {
  constructor(
    private readonly cabinetService: CabinetService,
    private readonly householdsService: HouseholdsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('agent-data/cabinet/search')
  @ApiOperation({ summary: 'Agent 按短期会话权限查询家庭药箱' })
  async searchForAgent(@Headers('x-agent-token') token: string | undefined, @Body() dto: SearchCabinetToolDto) {
    if (!process.env.AGENT_INTERNAL_TOKEN || token !== process.env.AGENT_INTERNAL_TOKEN) throw new ForbiddenException('Agent token 无效');
    const invalid = dto.mode === 'name'
      ? !dto.names.some(name => name.trim()) || Boolean(dto.symptoms.trim())
      : dto.mode === 'inventory'
        ? Boolean(dto.names.length) || Boolean(dto.symptoms.trim())
        : Boolean(dto.names.length) || !dto.symptoms.trim();
    if (invalid) throw new BadRequestException('药名、症状与库存查询参数不能混用');
    const scope = verifyCabinetScope(dto.scope);
    const user = await this.prisma.appUser.findFirst({ where: { id: scope.userId, deletedAt: null, status: 'active' }, select: { id: true } });
    if (!user) throw new ForbiddenException('用户不可用');
    const current = await this.householdsService.resolveCurrentHousehold(scope.userId, scope.householdId);
    if (!scope.debug) {
      const session = await this.prisma.consultationSession.findFirst({
        where: { id: scope.sessionId, householdId: current.householdId, deletedAt: null }, select: { id: true },
      });
      if (!session) throw new ForbiddenException('会话不可用');
    }
    return this.cabinetService.searchForAgent(current.householdId, dto);
  }

  @Get('medicine/cabinet')
  @UseGuards(AppJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'App 查询当前家庭药箱' })
  async findCabinet(
    @Req() req: AppRequest,
    @Headers('x-household-id') requestedHouseholdId: string | undefined,
    @Query() query: QueryCabinetDto,
  ) {
    const current = await this.householdsService.resolveCurrentHousehold(req.user.appUserId, requestedHouseholdId);
    return this.cabinetService.findCabinet(query, current.householdId);
  }

  @Post('medicine/cabinet')
  @UseGuards(AppJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'App 新增当前家庭药箱库存' })
  async create(
    @Req() req: AppRequest,
    @Headers('x-household-id') requestedHouseholdId: string | undefined,
    @Body() dto: CreateCabinetInventoryDto,
  ) {
    const current = await this.householdsService.resolveCurrentHousehold(req.user.appUserId, requestedHouseholdId);
    return this.cabinetService.create(dto, current);
  }

  @Patch('medicine/cabinet/:inventoryId')
  @UseGuards(AppJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'App 更新当前家庭药箱库存' })
  async update(
    @Req() req: AppRequest,
    @Headers('x-household-id') requestedHouseholdId: string | undefined,
    @Param('inventoryId') inventoryId: string,
    @Body() dto: UpdateCabinetInventoryDto,
  ) {
    const current = await this.householdsService.resolveCurrentHousehold(req.user.appUserId, requestedHouseholdId);
    return this.cabinetService.update(inventoryId, current.householdId, dto);
  }

  @Delete('medicine/cabinet/:inventoryId')
  @UseGuards(AppJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'App 删除当前家庭药箱库存' })
  async remove(
    @Req() req: AppRequest,
    @Headers('x-household-id') requestedHouseholdId: string | undefined,
    @Param('inventoryId') inventoryId: string,
  ) {
    const current = await this.householdsService.resolveCurrentHousehold(req.user.appUserId, requestedHouseholdId);
    return this.cabinetService.remove(inventoryId, current.householdId);
  }

  @Get('admin/household-medicines')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('family-doctor:household-medicine:view')
  @ApiBearerAuth()
  @ApiOperation({ summary: '后台查询家庭药箱库存' })
  findAdminCabinet(@Query() query: QueryAdminCabinetDto) {
    return this.cabinetService.findAdminCabinet(query);
  }

  @Delete('admin/household-medicines/:inventoryId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('family-doctor:household-medicine:delete')
  @ApiBearerAuth()
  @ApiOperation({ summary: '后台删除家庭药箱库存' })
  removeAdmin(@Param('inventoryId') inventoryId: string) {
    return this.cabinetService.removeAdmin(inventoryId);
  }
}
