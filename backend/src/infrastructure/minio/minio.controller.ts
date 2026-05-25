import {
  BadRequestException,
  Controller,
  Post,
  Get,
  Delete,
  UseInterceptors,
  UseGuards,
  UploadedFile,
  UploadedFiles,
  Query,
  Body,
  ParseArrayPipe,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { MinioService } from './minio.service';
import { BufferedFile } from './dto/file.dto';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { Request } from '@nestjs/common';

@ApiTags('后台接口/文件存储')
@Controller(['files', 'api/files'])
@ApiBearerAuth()
export class MinioController {
  private static readonly MAX_IMAGE_SIZE = 5 * 1024 * 1024;
  private static readonly MAX_VIDEO_SIZE = 50 * 1024 * 1024;
  private static readonly ALLOWED_IMAGE_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
  ]);
  private static readonly ALLOWED_VIDEO_TYPES = new Set([
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
  ]);

  constructor(
    private readonly minioService: MinioService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 上传单个文件
   */
  @Post('upload')
  @ApiOperation({ summary: '上传单个文件' })
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard)
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '文件',
        },
        path: {
          type: 'string',
          description: '存储路径（可选）',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: BufferedFile,
    @Query('path') path?: string,
    @Request() req?: any,
  ): Promise<{ filename: string; objectKey: string; url: string; etag: string }> {
    this.validateUploadFile(file);

    const result = await this.minioService.uploadFile(file, path);

    // 写入上传记录
    const module = this.inferModuleFromPath(path);
    const user = req?.user;
    await this.prisma.uploadRecord.create({
      data: {
        userId: user?.userId,
        originalName: file.originalname,
        storedName: result.objectKey,
        objectKey: result.objectKey,
        url: result.url,
        mimeType: file.mimetype,
        size: file.size,
        module,
      },
    });

    return {
      filename: file.originalname,
      objectKey: result.objectKey,
      url: result.url,
      etag: result.etag,
    };
  }

  /**
   * 上传多个文件
   */
  @Post('upload/multiple')
  @ApiOperation({ summary: '上传多个文件' })
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard)
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: '文件列表',
        },
        path: {
          type: 'string',
          description: '存储路径（可选）',
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadFiles(
    @UploadedFiles() files: BufferedFile[],
    @Query('path') path?: string,
    @Request() req?: any,
  ): Promise<Array<{ filename: string; objectKey: string; url: string; etag: string }>> {
    if (!files?.length) {
      throw new BadRequestException('请至少上传一个文件');
    }

    files.forEach(file => this.validateUploadFile(file));

    const results = await this.minioService.uploadFiles(files, path);

    // 批量写入上传记录
    const module = this.inferModuleFromPath(path);
    const user = req?.user;
    await this.prisma.uploadRecord.createMany({
      data: results.map((result, index) => ({
        userId: user?.userId,
        originalName: files[index].originalname,
        storedName: result.objectKey,
        objectKey: result.objectKey,
        url: result.url,
        mimeType: files[index].mimetype,
        size: files[index].size,
        module,
      })),
      skipDuplicates: true,
    });

    return results.map((result, index) => ({
        filename: files[index].originalname,
        objectKey: result.objectKey,
        url: result.url,
        etag: result.etag,
      }));
  }

  /**
   * 获取文件 URL
   */
  @Get('url')
  @ApiOperation({ summary: '获取文件访问 URL' })
  @UseGuards(JwtAuthGuard)
  async getFileUrl(
    @Query('filename') filename: string,
    @Query('expiry') expiry?: string,
  ): Promise<{ url: string }> {
    const url = await this.minioService.getFileUrl(
      filename,
      expiry ? parseInt(expiry, 10) : undefined,
    );
    return { url };
  }

  /**
   * 预览文件（通过后端代理访问，避免暴露容器内地址）
   */
  @Get('preview')
  @ApiOperation({ summary: '预览文件' })
  async previewFile(
    @Query('filename') filename: string,
    @Res({ passthrough: true }) res: any,
  ): Promise<StreamableFile> {
    const { stream, contentType } = await this.minioService.getFileStream(filename);

    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    res.setHeader('Cache-Control', 'public, max-age=300');

    return new StreamableFile(stream);
  }

  /**
   * 删除文件
   */
  @Delete('delete')
  @ApiOperation({ summary: '删除文件' })
  @UseGuards(JwtAuthGuard)
  async deleteFile(
    @Body('filename') filename: string,
  ): Promise<{ success: boolean }> {
    await this.minioService.deleteFile(filename);
    return { success: true };
  }

  /**
   * 批量删除文件
   */
  @Delete('delete/batch')
  @ApiOperation({ summary: '批量删除文件' })
  @UseGuards(JwtAuthGuard)
  async deleteFiles(
    @Body('filenames', new ParseArrayPipe({ items: String })) filenames: string[],
  ): Promise<{ success: boolean }> {
    await this.minioService.deleteFiles(filenames);
    return { success: true };
  }

  /**
   * 列出文件
   */
  @Get('list')
  @ApiOperation({ summary: '列出文件' })
  @UseGuards(JwtAuthGuard)
  async listFiles(
    @Query('prefix') prefix?: string,
    @Query('recursive') recursive?: string,
  ): Promise<Array<{ name?: string; size: number; lastModified?: Date; etag?: string; prefix?: string }>> {
    const files = await this.minioService.listFiles(
      prefix,
      recursive === 'true',
    );
    return files.map(file => ({
        name: file.name,
        size: file.size,
        lastModified: file.lastModified,
        etag: file.etag,
        prefix: file.prefix,
      }));
  }

  /**
   * 获取文件信息
   */
  @Get('stat')
  @ApiOperation({ summary: '获取文件信息' })
  @UseGuards(JwtAuthGuard)
  async getFileStat(
    @Query('filename') filename: string,
  ): Promise<{ size: number; etag: string; lastModified: Date; contentType: string | undefined }> {
    const stat = await this.minioService.getFileStat(filename);
    return {
      size: stat.size,
      etag: stat.etag,
      lastModified: stat.lastModified,
      contentType: stat.metaData?.['content-type'],
    };
  }

  /**
   * 获取预签名上传 URL
   */
  @Get('presigned-upload')
  @ApiOperation({ summary: '获取预签名上传 URL（用于前端直传）' })
  @UseGuards(JwtAuthGuard)
  async getPresignedUploadUrl(
    @Query('filename') filename: string,
    @Query('expiry') expiry?: string,
  ): Promise<{ url: string }> {
    const url = await this.minioService.getPresignedUploadUrl(
      filename,
      expiry ? parseInt(expiry, 10) : undefined,
    );
    return { url };
  }

  /**
   * 检查文件是否存在
   */
  @Get('exists')
  @ApiOperation({ summary: '检查文件是否存在' })
  @UseGuards(JwtAuthGuard)
  async fileExists(
    @Query('filename') filename: string,
  ): Promise<{ exists: boolean }> {
    const exists = await this.minioService.fileExists(filename);
    return { exists };
  }

  private inferModuleFromPath(path?: string): string {
    if (!path) return 'unknown';
    const segments = path.split('/').filter(Boolean);
    return segments[0] || 'unknown';
  }

  private validateUploadFile(file?: BufferedFile): void {
    if (!file) {
      throw new BadRequestException('请选择要上传的文件');
    }

    if (MinioController.ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      if (file.size > MinioController.MAX_IMAGE_SIZE) {
        throw new BadRequestException('图片大小不能超过 5MB');
      }
      return;
    }

    if (MinioController.ALLOWED_VIDEO_TYPES.has(file.mimetype)) {
      if (file.size > MinioController.MAX_VIDEO_SIZE) {
        throw new BadRequestException('视频大小不能超过 50MB');
      }
      return;
    }

    throw new BadRequestException('仅支持 JPG、PNG、WEBP、GIF、AVIF、MP4、WEBM、OGG、MOV 格式文件');
  }
}
