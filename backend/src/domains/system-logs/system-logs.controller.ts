import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { RequirePermissions } from '@/auth/decorators/permissions.decorator';
import { SystemLogsService } from './system-logs.service';
import { QueryOperationLogDto } from './dto/query-operation-log.dto';
import { QueryLoginLogDto } from './dto/query-login-log.dto';

@ApiTags('后台接口/系统日志')
@Controller('system-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class SystemLogsController {
  constructor(private readonly systemLogsService: SystemLogsService) {}

  @Get('operations')
  @RequirePermissions('system:log:view')
  @ApiOperation({ summary: '操作审计日志列表' })
  @ApiOkResponse()
  findOperationLogs(@Query() query: QueryOperationLogDto) {
    return this.systemLogsService.findOperationLogs(query);
  }

  @Get('logins')
  @RequirePermissions('system:log:view')
  @ApiOperation({ summary: '登录安全日志列表' })
  @ApiOkResponse()
  findLoginLogs(@Query() query: QueryLoginLogDto) {
    return this.systemLogsService.findLoginLogs(query);
  }
}
