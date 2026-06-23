import { Body, Controller, Delete, ForbiddenException, Get, Headers, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppJwtAuthGuard } from '@/domains/app-auth/guards/app-jwt-auth.guard';
import { HouseholdsService } from '@/domains/households/households.service';
import { CreateCronJobDto } from './dto/create-cron-job.dto';
import { CreateCronJobExecutionDto } from './dto/create-cron-job-execution.dto';
import { QueryCronJobsDto } from './dto/query-cron-jobs.dto';
import { UpdateCronJobScheduleDto } from './dto/update-cron-job-schedule.dto';
import { UpdateCronJobStatusDto } from './dto/update-cron-job-status.dto';
import { RemindersService } from './reminders.service';

type AppRequest = {
  user: {
    appUserId: string;
  };
};

@ApiTags('家庭医生/定时任务')
@Controller()
export class RemindersController {
  constructor(
    private readonly remindersService: RemindersService,
    private readonly householdsService: HouseholdsService,
  ) {}

  @Get('cron-jobs')
  @UseGuards(AppJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'App 查询当前家庭定时任务' })
  async findAppJobs(
    @Req() req: AppRequest,
    @Headers('x-household-id') requestedHouseholdId: string | undefined,
    @Query() query: QueryCronJobsDto,
  ) {
    const current = await this.householdsService.resolveCurrentHousehold(req.user.appUserId, requestedHouseholdId);
    return this.remindersService.findForApp(query, current.householdId);
  }

  @Patch('cron-jobs/:jobId/status')
  @UseGuards(AppJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'App 启用或停用定时任务' })
  async updateAppStatus(
    @Req() req: AppRequest,
    @Headers('x-household-id') requestedHouseholdId: string | undefined,
    @Param('jobId') jobId: string,
    @Body() dto: UpdateCronJobStatusDto,
  ) {
    const current = await this.householdsService.resolveCurrentHousehold(req.user.appUserId, requestedHouseholdId);
    return this.remindersService.updateStatus(jobId, current.householdId, dto.status);
  }

  @Delete('cron-jobs/:jobId')
  @UseGuards(AppJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'App 删除定时任务' })
  async removeAppJob(
    @Req() req: AppRequest,
    @Headers('x-household-id') requestedHouseholdId: string | undefined,
    @Param('jobId') jobId: string,
  ) {
    const current = await this.householdsService.resolveCurrentHousehold(req.user.appUserId, requestedHouseholdId);
    return this.remindersService.remove(jobId, current.householdId);
  }

  @Get('cron-jobs/:jobId/executions')
  @UseGuards(AppJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'App 查询定时任务执行记录' })
  async findAppExecutions(
    @Req() req: AppRequest,
    @Headers('x-household-id') requestedHouseholdId: string | undefined,
    @Param('jobId') jobId: string,
  ) {
    const current = await this.householdsService.resolveCurrentHousehold(req.user.appUserId, requestedHouseholdId);
    return this.remindersService.findExecutions(jobId, current.householdId);
  }

  @Post('agent-data/cron-jobs')
  @ApiOperation({ summary: 'Agent 内部创建定时任务数据' })
  createAgentJob(@Headers('x-agent-token') token: string | undefined, @Body() dto: CreateCronJobDto) {
    this.assertAgentToken(token);
    return this.remindersService.create(dto);
  }

  @Get('agent-data/cron-jobs')
  @ApiOperation({ summary: 'Agent 内部查询定时任务数据' })
  findAgentJobs(@Headers('x-agent-token') token: string | undefined, @Query() query: QueryCronJobsDto) {
    this.assertAgentToken(token);
    return this.remindersService.findMany(query);
  }

  @Get('agent-data/cron-jobs/due')
  @ApiOperation({ summary: 'Agent 内部查询到期定时任务' })
  findDueAgentJobs(@Headers('x-agent-token') token: string | undefined, @Query('now') now?: string) {
    this.assertAgentToken(token);
    return this.remindersService.findDueJobs(now);
  }

  @Patch('agent-data/cron-jobs/:jobId/status')
  @ApiOperation({ summary: 'Agent 内部更新定时任务状态' })
  updateAgentStatus(
    @Headers('x-agent-token') token: string | undefined,
    @Param('jobId') jobId: string,
    @Body() dto: UpdateCronJobStatusDto,
  ) {
    this.assertAgentToken(token);
    return this.remindersService.updateStatus(jobId, null, dto.status);
  }

  @Patch('agent-data/cron-jobs/:jobId/schedule')
  @ApiOperation({ summary: 'Agent 内部更新定时任务下次执行时间' })
  updateAgentSchedule(
    @Headers('x-agent-token') token: string | undefined,
    @Param('jobId') jobId: string,
    @Body() dto: UpdateCronJobScheduleDto,
  ) {
    this.assertAgentToken(token);
    return this.remindersService.updateSchedule(jobId, dto);
  }

  @Delete('agent-data/cron-jobs/:jobId')
  @ApiOperation({ summary: 'Agent 内部删除定时任务数据' })
  removeAgentJob(@Headers('x-agent-token') token: string | undefined, @Param('jobId') jobId: string) {
    this.assertAgentToken(token);
    return this.remindersService.remove(jobId, null);
  }

  @Post('agent-data/cron-jobs/:jobId/executions')
  @ApiOperation({ summary: 'Agent 内部写入定时任务执行记录' })
  createAgentExecution(
    @Headers('x-agent-token') token: string | undefined,
    @Param('jobId') jobId: string,
    @Body() dto: CreateCronJobExecutionDto,
  ) {
    this.assertAgentToken(token);
    return this.remindersService.createExecution(jobId, dto);
  }

  @Get('agent-data/cabinet/expired')
  @ApiOperation({ summary: 'Agent 内部查询过期药品' })
  findExpiredMedicines(
    @Headers('x-agent-token') token: string | undefined,
    @Query('householdId') householdId?: string,
  ) {
    this.assertAgentToken(token);
    return this.remindersService.findExpiredMedicines(householdId);
  }

  private assertAgentToken(token?: string) {
    const expected = process.env.AGENT_INTERNAL_TOKEN;
    if (expected && token !== expected) {
      throw new ForbiddenException('Agent token 无效');
    }
  }
}
