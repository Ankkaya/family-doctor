import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as Minio from 'minio';
import { BufferedFile } from './dto/file.dto';
import { Readable } from 'stream';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger('MinioService');
  private minioClient: Minio.Client;
  private bucketName: string;
  private readonly fileBaseUrl: string;
  private readonly shouldSkipInitCheck: boolean;

  constructor() {
    this.minioClient = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000', 10),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
    });
    this.bucketName = process.env.MINIO_BUCKET_NAME || 'docker-demo';
    this.fileBaseUrl = this.resolveFileBaseUrl();
    this.shouldSkipInitCheck =
      process.env.MINIO_SKIP_INIT === 'true' || process.env.NODE_ENV === 'test';
  }

  async onModuleInit() {
    // 打印 MinIO 连接信息
    const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
    const port = process.env.MINIO_PORT || '9000';
    const useSSL = process.env.MINIO_USE_SSL === 'true';
    const accessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
    const maskedAccessKey = accessKey.length > 4 
      ? `${accessKey.slice(0, 2)}***${accessKey.slice(-2)}` 
      : '***';
    
    this.logger.log('----------------------------------------');
    this.logger.log('📦 MinIO 存储服务初始化');
    this.logger.log('----------------------------------------');
    this.logger.log(`🌐 服务端点: ${useSSL ? 'https' : 'http'}://${endpoint}:${port}`);
    this.logger.log(`🔑 访问密钥: ${maskedAccessKey}`);
    this.logger.log(`📁 存储桶名: ${this.bucketName}`);
    this.logger.log(`🖼️ 文件访问基地址: ${this.fileBaseUrl}`);

    if (this.shouldSkipInitCheck) {
      this.logger.warn('⏭️  已跳过 MinIO 启动连通性检查');
      this.logger.log('----------------------------------------');
      return;
    }

    try {
      // 检查 bucket 是否存在，不存在则创建
      const bucketExists = await this.minioClient.bucketExists(this.bucketName);
      if (!bucketExists) {
        this.logger.log(`⚙️  创建存储桶: ${this.bucketName}`);
        await this.minioClient.makeBucket(this.bucketName);
        this.logger.log(`✅ 存储桶创建成功`);
      } else {
        this.logger.log(`✅ 存储桶已存在`);
      }
      
      this.logger.log('✅ MinIO 服务连接成功');
      this.logger.log('----------------------------------------');
    } catch (error) {
      this.logger.error('❌ MinIO 服务连接失败');
      this.logger.error(`   错误信息: ${error.message}`);
      this.logger.log('----------------------------------------');
      throw error;
    }
  }

  /**
   * 上传文件
   */
  async uploadFile(file: BufferedFile, path: string = ''): Promise<{ objectKey: string; url: string; etag: string }> {
    const objectKey = this.buildObjectKey(file.originalname, path);
    
    const objectInfo = await this.minioClient.putObject(
      this.bucketName,
      objectKey,
      file.buffer,
      file.size,
      {
        'Content-Type': file.mimetype,
      },
    );

    const url = this.getProxyUrl(objectKey);
    
    return {
      objectKey,
      url,
      etag: objectInfo.etag,
    };
  }

  /**
   * 上传多个文件
   */
  async uploadFiles(files: BufferedFile[], path: string = ''): Promise<{ objectKey: string; url: string; etag: string }[]> {
    const uploadPromises = files.map(file => this.uploadFile(file, path));
    return Promise.all(uploadPromises);
  }

  async uploadBuffer(
    buffer: Buffer,
    filename: string,
    path: string = '',
    contentType: string = 'application/octet-stream',
  ): Promise<{ objectKey: string; url: string; etag: string }> {
    const objectKey = path ? `${path}/${filename}` : filename;
    const objectInfo = await this.minioClient.putObject(
      this.bucketName,
      objectKey,
      buffer,
      buffer.length,
      {
        'Content-Type': contentType,
      },
    );

    return {
      objectKey,
      url: this.getProxyUrl(objectKey),
      etag: objectInfo.etag,
    };
  }

  /**
   * 获取文件访问 URL
   */
  async getFileUrl(filename: string, expiry: number = 24 * 60 * 60): Promise<string> {
    return await this.minioClient.presignedGetObject(
      this.bucketName,
      filename,
      expiry,
    );
  }

  /**
   * 获取文件直链（用于公开访问，需要先设置 bucket 为 public）
   */
  getPublicUrl(filename: string): string {
    const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
    const port = process.env.MINIO_PORT || '9000';
    const host = process.env.MINIO_ENDPOINT || 'localhost';
    return `${protocol}://${host}:${port}/${this.bucketName}/${filename}`;
  }

  /**
   * 删除文件
   */
  async deleteFile(filename: string): Promise<void> {
    await this.minioClient.removeObject(this.bucketName, filename);
  }

  /**
   * 删除多个文件
   */
  async deleteFiles(filenames: string[]): Promise<void> {
    await this.minioClient.removeObjects(this.bucketName, filenames);
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(filename: string): Promise<boolean> {
    try {
      await this.minioClient.statObject(this.bucketName, filename);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取文件信息
   */
  async getFileStat(filename: string): Promise<Minio.BucketItemStat> {
    return await this.minioClient.statObject(this.bucketName, filename);
  }

  /**
   * 列出桶中的文件
   */
  async listFiles(prefix: string = '', recursive: boolean = false): Promise<Minio.BucketItem[]> {
    const stream = this.minioClient.listObjects(this.bucketName, prefix, recursive);
    const files: Minio.BucketItem[] = [];
    
    return new Promise((resolve, reject) => {
      stream.on('data', (item: Minio.BucketItem) => {
        if (item.name) {
          files.push(item as Minio.BucketItem);
        }
      });
      stream.on('end', () => {
        resolve(files);
      });
      stream.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * 创建上传预签名 URL（用于前端直传）
   */
  async getPresignedUploadUrl(filename: string, expiry: number = 60 * 60): Promise<string> {
    return await this.minioClient.presignedPutObject(
      this.bucketName,
      filename,
      expiry,
    );
  }

  async getFileStream(filename: string): Promise<{ stream: Readable; contentType?: string }> {
    const stat = await this.minioClient.statObject(this.bucketName, filename);
    const stream = await this.minioClient.getObject(this.bucketName, filename);

    return {
      stream,
      contentType: stat.metaData?.['content-type'],
    };
  }

  normalizeStoredFileReference(value?: string | null): string | null {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const extracted = this.extractObjectKey(trimmed);
    return extracted ?? trimmed;
  }

  async resolveStoredFileUrl(value?: string | null): Promise<string | null> {
    const normalized = this.normalizeStoredFileReference(value);
    if (!normalized) {
      return null;
    }

    if (this.looksLikeExternalUrl(normalized)) {
      return normalized;
    }

    return this.getProxyUrl(normalized);
  }

  getStoredFileProxyUrl(filename: string): string {
    return this.getProxyUrl(filename);
  }

  async resolveStoredFileUrls(values?: Array<string | null> | null): Promise<string[]> {
    if (!values || values.length === 0) {
      return [];
    }

    const resolved = await Promise.all(values.map(value => this.resolveStoredFileUrl(value)));
    return resolved.filter((value): value is string => Boolean(value));
  }

  private buildObjectKey(originalName: string, path: string = ''): string {
    const timestamp = Date.now();
    const safeName = originalName.replace(/\\/g, '/').split('/').pop() || 'file';
    return `${path ? `${path}/` : ''}${timestamp}-${safeName}`;
  }

  private extractObjectKey(value: string): string | null {
    try {
      const parsed = value.startsWith('http://') || value.startsWith('https://')
        ? new URL(value)
        : new URL(value, 'http://local');
      const bucketPrefix = `/${this.bucketName}/`;
      if (parsed.pathname.startsWith(bucketPrefix)) {
        return decodeURIComponent(parsed.pathname.slice(bucketPrefix.length));
      }
      if (parsed.pathname.endsWith('/api/files/preview') || parsed.pathname.endsWith('/files/preview')) {
        const filename = parsed.searchParams.get('filename');
        return filename ? decodeURIComponent(filename) : null;
      }
      return null;
    } catch {
      return null;
    }
  }

  private looksLikeExternalUrl(value: string): boolean {
    return /^https?:\/\//i.test(value);
  }

  private getProxyUrl(filename: string): string {
    const previewPath = `/api/files/preview?filename=${encodeURIComponent(filename)}`;
    return new URL(previewPath, this.fileBaseUrl).toString();
  }

  private resolveFileBaseUrl(): string {
    const explicitBaseUrl = process.env.FILE_BASE_URL
      || process.env.PUBLIC_BASE_URL
      || process.env.APP_BASE_URL;
    if (explicitBaseUrl?.trim()) {
      return this.ensureTrailingSlash(explicitBaseUrl.trim());
    }

    const protocol = process.env.APP_PROTOCOL || 'http';
    const host = process.env.APP_HOST || 'localhost';
    const port = process.env.PORT || '3001';
    return this.ensureTrailingSlash(`${protocol}://${host}:${port}`);
  }

  private ensureTrailingSlash(value: string): string {
    return value.endsWith('/') ? value : `${value}/`;
  }
}
