import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { RequirePermissions } from '@/auth/decorators/permissions.decorator';
import { UploadRecordsService } from './upload-records.service';
import { QueryUploadRecordDto } from './dto/query-upload-record.dto';

@ApiTags('后台接口/文件记录')
@Controller('upload-records')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class UploadRecordsController {
  constructor(private readonly uploadRecordsService: UploadRecordsService) {}

  @Get()
  @RequirePermissions('system:upload-record:view')
  @ApiOperation({ summary: '上传记录列表' })
  @ApiOkResponse()
  findAll(@Query() query: QueryUploadRecordDto) {
    return this.uploadRecordsService.findAll(query);
  }
}
