import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MinioModule } from '@/infrastructure/minio/minio.module';
import { PrismaModule } from '@/infrastructure/prisma/prisma.module';
import { AppAuthController } from './app-auth.controller';
import { AppAuthService } from './app-auth.service';
import { AppJwtStrategy } from './strategies/app-jwt.strategy';

@Module({
  imports: [
    PrismaModule,
    MinioModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.APP_JWT_SECRET || process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: (process.env.APP_JWT_EXPIRES_IN || '7d') as any },
    }),
  ],
  controllers: [AppAuthController],
  providers: [AppAuthService, AppJwtStrategy],
  exports: [AppAuthService],
})
export class AppAuthModule {}
