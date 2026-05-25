import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { RequirePermissions } from '@/auth/decorators/permissions.decorator';
import { QueryMedicineDto } from './dto/query-medicine.dto';
import { UpsertMedicineDto } from './dto/upsert-medicine.dto';
import { MedicineService } from './medicine.service';

@ApiTags('家庭医生/药品目录')
@Controller()
export class MedicineController {
  constructor(private readonly medicineService: MedicineService) {}

  @Get('medicine/catalog')
  @ApiOperation({ summary: 'App 查询药品目录' })
  findCatalog(@Query() query: QueryMedicineDto) {
    return this.medicineService.findCatalog(query);
  }

  @Get('medicine/catalog/:id')
  @ApiOperation({ summary: 'App 查询药品详情' })
  findOne(@Param('id') id: string) {
    return this.medicineService.findOne(id);
  }

  @Get('admin/medicine')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('family-doctor:medicine:view')
  @ApiBearerAuth()
  @ApiOperation({ summary: '后台查询药品目录' })
  findAdminCatalog(@Query() query: QueryMedicineDto) {
    return this.medicineService.findCatalog(query);
  }

  @Post('admin/medicine')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('family-doctor:medicine:create')
  @ApiBearerAuth()
  @ApiOperation({ summary: '后台新增药品' })
  create(@Body() dto: UpsertMedicineDto) {
    return this.medicineService.create(dto);
  }

  @Patch('admin/medicine/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('family-doctor:medicine:update')
  @ApiBearerAuth()
  @ApiOperation({ summary: '后台更新药品' })
  update(@Param('id') id: string, @Body() dto: UpsertMedicineDto) {
    return this.medicineService.update(id, dto);
  }

  @Delete('admin/medicine/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('family-doctor:medicine:delete')
  @ApiBearerAuth()
  @ApiOperation({ summary: '后台删除药品' })
  remove(@Param('id') id: string) {
    return this.medicineService.remove(id);
  }
}
