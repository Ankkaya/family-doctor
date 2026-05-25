import { Body, Controller, Get, Headers, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppJwtAuthGuard } from '@/domains/app-auth/guards/app-jwt-auth.guard';
import { CreateHouseholdDto } from './dto/create-household.dto';
import { JoinHouseholdDto } from './dto/join-household.dto';
import { UpdateHouseholdMemberDto } from './dto/update-household-member.dto';
import { HouseholdsService } from './households.service';

type AppRequest = {
  user: {
    appUserId: string;
  };
};

@ApiTags('App/家庭')
@ApiBearerAuth()
@UseGuards(AppJwtAuthGuard)
@Controller('app/households')
export class HouseholdsController {
  constructor(private readonly householdsService: HouseholdsService) {}

  @Get()
  @ApiOperation({ summary: 'App 查询当前用户家庭列表' })
  list(@Req() req: AppRequest) {
    return this.householdsService.listForUser(req.user.appUserId);
  }

  @Post()
  @ApiOperation({ summary: 'App 创建家庭' })
  create(@Req() req: AppRequest, @Body() dto: CreateHouseholdDto) {
    return this.householdsService.create(req.user.appUserId, dto);
  }

  @Post('join')
  @ApiOperation({ summary: 'App 通过 6 位家庭邀请码加入家庭' })
  join(@Req() req: AppRequest, @Body() dto: JoinHouseholdDto) {
    return this.householdsService.joinByCode(req.user.appUserId, dto);
  }

  @Get(':householdId/members')
  @ApiOperation({ summary: 'App 查询家庭成员' })
  async members(
    @Req() req: AppRequest,
    @Param('householdId') householdId: string,
    @Headers('x-household-id') currentHouseholdId?: string,
  ) {
    await this.householdsService.resolveCurrentHousehold(req.user.appUserId, currentHouseholdId || householdId);
    return this.householdsService.listMembers(householdId);
  }

  @Patch(':householdId/members/:memberId')
  @ApiOperation({ summary: 'App 家庭管理员编辑家庭成员' })
  updateMember(
    @Req() req: AppRequest,
    @Param('householdId') householdId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateHouseholdMemberDto,
  ) {
    return this.householdsService.updateMember(req.user.appUserId, householdId, memberId, dto);
  }
}
