import { Body, Controller, Delete, Get, Headers, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { RequirePermissions } from '@/auth/decorators/permissions.decorator';
import { AppJwtAuthGuard } from '@/domains/app-auth/guards/app-jwt-auth.guard';
import { HouseholdsService } from '@/domains/households/households.service';
import { AskConsultationDto } from './dto/ask-consultation.dto';
import { QueryConsultationDto } from './dto/query-consultation.dto';
import { ConsultationService } from './consultation.service';

type AppRequest = {
  user: {
    appUserId: string;
  };
};

@ApiTags('家庭医生/问诊')
@Controller()
export class ConsultationController {
  constructor(
    private readonly consultationService: ConsultationService,
    private readonly householdsService: HouseholdsService,
  ) {}

  @Post('consultation/ask')
  @UseGuards(AppJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'App 发起一次问诊' })
  async ask(
    @Req() req: AppRequest,
    @Headers('x-household-id') requestedHouseholdId: string | undefined,
    @Body() dto: AskConsultationDto,
  ) {
    const current = await this.householdsService.resolveCurrentHousehold(req.user.appUserId, requestedHouseholdId);
    return this.consultationService.ask(dto, current);
  }

  @Get('consultation/sessions')
  @UseGuards(AppJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'App 查询当前用户问诊历史' })
  async findUserSessions(
    @Req() req: AppRequest,
    @Headers('x-household-id') requestedHouseholdId: string | undefined,
    @Query() query: QueryConsultationDto,
  ) {
    const current = await this.householdsService.resolveCurrentHousehold(req.user.appUserId, requestedHouseholdId);
    return this.consultationService.findUserSessions(query, current);
  }

  @Get('consultation/sessions/:id')
  @UseGuards(AppJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'App 查看当前用户问诊详情' })
  async findUserSession(
    @Req() req: AppRequest,
    @Headers('x-household-id') requestedHouseholdId: string | undefined,
    @Param('id') id: string,
  ) {
    const current = await this.householdsService.resolveCurrentHousehold(req.user.appUserId, requestedHouseholdId);
    return this.consultationService.findUserSession(id, current);
  }

  @Get('admin/consultations')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('family-doctor:consultation:view')
  @ApiBearerAuth()
  @ApiOperation({ summary: '后台查询问诊会话列表' })
  findSessions(@Query() query: QueryConsultationDto) {
    return this.consultationService.findSessions(query);
  }

  @Get('admin/consultations/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('family-doctor:consultation:view')
  @ApiBearerAuth()
  @ApiOperation({ summary: '后台查看问诊会话详情和 Agent Trace' })
  findSession(@Param('id') id: string) {
    return this.consultationService.findSession(id);
  }

  @Delete('admin/consultations/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('family-doctor:consultation:delete')
  @ApiBearerAuth()
  @ApiOperation({ summary: '后台删除问诊会话' })
  removeAdmin(@Param('id') id: string) {
    return this.consultationService.removeAdmin(id);
  }
}
