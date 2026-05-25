import '../load-env';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AuthModule } from './domains/auth/auth.module';
import { AppUsersModule } from './domains/app-users/app-users.module';
import { DictionariesModule } from './domains/dictionaries/dictionaries.module';
import { MenusModule } from './domains/menus/menus.module';
import { RolesModule } from './domains/roles/roles.module';
import { SystemLogsModule } from './domains/system-logs/system-logs.module';
import { SystemSettingsModule } from './domains/system-settings/system-settings.module';
import { UploadRecordsModule } from './domains/upload-records/upload-records.module';
import { UsersModule } from './domains/users/users.module';
import { FamilyDoctorModule } from './domains/family-doctor/family-doctor.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { OperationLogInterceptor } from './common/interceptors/operation-log.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaService } from './infrastructure/prisma/prisma.service';

function isTruthyEnv(value: string | undefined, defaultValue = false): boolean {
  if (value === undefined || value === '') {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function parseCorsOrigins(value: string | undefined): string[] {
  return (value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function assertRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`缺少必填环境变量 ${name}`);
  }

  return value;
}

function assertSafeSecret(name: string, minLength = 32): void {
  const value = assertRequiredEnv(name);
  const weakValues = ['CHANGE_ME', 'your-secret-key', 'your-super-secret-jwt-key-change-in-production'];

  if (weakValues.some((weakValue) => value.includes(weakValue)) || value.length < minLength) {
    throw new Error(`${name} 不安全：请配置长度至少 ${minLength} 位的真实随机密钥`);
  }
}

function validateRuntimeEnv(): void {
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (!['production', 'staging'].includes(nodeEnv)) {
    return;
  }

  assertRequiredEnv('DATABASE_URL');
  assertRequiredEnv('FILE_BASE_URL');
  assertRequiredEnv('REDIS_PASSWORD');
  assertRequiredEnv('MINIO_ACCESS_KEY');
  assertRequiredEnv('MINIO_SECRET_KEY');
  assertRequiredEnv('CORS_ORIGINS');
  assertSafeSecret('JWT_SECRET');
  assertSafeSecret('JWT_REFRESH_SECRET');
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  logger.log('========================================');
  logger.log('🚀 应用程序启动中...');
  logger.log('========================================');

  validateRuntimeEnv();

  // 打印数据库连接信息（隐藏密码）
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    const maskedUrl = dbUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
    logger.log(`📡 数据库地址: ${maskedUrl}`);
  } else {
    logger.error('❌ 未配置 DATABASE_URL 环境变量，请检查 backend/.env、.env.development 或系统环境变量');
  }

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  const corsOrigins = parseCorsOrigins(process.env.CORS_ORIGINS);
  if (corsOrigins.length > 0) {
    app.enableCors({ origin: corsOrigins, credentials: true });
    logger.log(`🌐 CORS 白名单: ${corsOrigins.join(', ')}`);
  } else {
    app.enableCors();
    logger.warn('⚠️ CORS_ORIGINS 未配置，当前允许所有来源');
  }

  // 全局验证管道
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  // 全局响应拦截器
  app.useGlobalInterceptors(new TransformInterceptor());

  // 全局异常过滤器
  app.useGlobalFilters(new HttpExceptionFilter());

  // 全局操作审计拦截器
  const prismaService = app.get(PrismaService);
  app.useGlobalInterceptors(new OperationLogInterceptor(prismaService));

  const enableSwagger = isTruthyEnv(process.env.ENABLE_SWAGGER, process.env.NODE_ENV !== 'production');
  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('Family Doctor Platform API')
      .setDescription('家庭药箱系统后台与 App BFF 接口文档')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config, {
      include: [
        AuthModule,
        AppUsersModule,
        DictionariesModule,
        UsersModule,
        RolesModule,
        MenusModule,
        SystemSettingsModule,
        SystemLogsModule,
        UploadRecordsModule,
        FamilyDoctorModule,
      ],
    });

    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  // 获取 PrismaService，确保数据库连接成功（已在上方声明）
  app.get(PrismaService);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log('========================================');
  logger.log('✅ 应用程序启动成功！');
  logger.log('========================================');
  logger.log(`🌐 API 服务地址: http://localhost:${port}`);
  if (enableSwagger) {
    logger.log(`📖 Swagger 文档: http://localhost:${port}/api/docs`);
  } else {
    logger.log('📖 Swagger 文档: 已禁用');
  }
  logger.log('========================================');
}
bootstrap();
