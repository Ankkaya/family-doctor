import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { RequirePermissions } from '@/auth/decorators/permissions.decorator';
import { BufferedFile } from '@/infrastructure/minio/dto/file.dto';
import { AppJwtAuthGuard } from '@/domains/app-auth/guards/app-jwt-auth.guard';
import { QueryMedicineDto } from './dto/query-medicine.dto';
import { UpsertMedicineDto } from './dto/upsert-medicine.dto';
import { MedicineService } from './medicine.service';

type AppRequest = {
  user: {
    appUserId: string;
  };
};

@ApiTags('家庭医生/药品目录')
@Controller()
export class MedicineController {
  private static readonly MAX_IMAGE_SIZE = 5 * 1024 * 1024;
  private static readonly ALLOWED_IMAGE_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
  ]);

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

  @Post('medicine/recognize-images')
  @UseGuards(AppJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'App 识别药盒图片并提取药品信息' })
  @UseInterceptors(FilesInterceptor('files', 4))
  recognizeImages(
    @Req() _req: AppRequest,
    @UploadedFiles() files: BufferedFile[],
  ) {
    this.validateRecognitionFiles(files);
    return this.medicineService.recognizeFromImages(files);
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

  private validateRecognitionFiles(files?: BufferedFile[]) {
    if (!files?.length) {
      throw new BadRequestException('请至少上传一张药品图片');
    }

    files.forEach((file) => {
      if (!MedicineController.ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
        throw new BadRequestException('药品图片仅支持 JPG、PNG、WEBP、GIF、AVIF 格式');
      }

      if (file.size > MedicineController.MAX_IMAGE_SIZE) {
        throw new BadRequestException('单张药品图片大小不能超过 5MB');
      }
    });
  }
}
