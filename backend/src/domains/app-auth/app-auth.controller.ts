import { BadRequestException, Body, Controller, Patch, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BufferedFile } from '@/infrastructure/minio/dto/file.dto';
import { AppJwtAuthGuard } from './guards/app-jwt-auth.guard';
import { AppAuthService } from './app-auth.service';
import { LoginAppUserDto } from './dto/login-app-user.dto';
import { RefreshAppTokenDto } from './dto/refresh-app-token.dto';
import { RegisterAppUserDto } from './dto/register-app-user.dto';
import { UpdateAppProfileDto } from './dto/update-app-profile.dto';

type AppRequest = {
  user: {
    appUserId: string;
  };
};

@ApiTags('App/认证')
@Controller('app/auth')
export class AppAuthController {
  private static readonly MAX_AVATAR_SIZE = 5 * 1024 * 1024;
  private static readonly ALLOWED_AVATAR_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
  ]);

  constructor(private readonly appAuthService: AppAuthService) {}

  @Post('anonymous')
  @ApiOperation({ summary: 'App 创建匿名身份和默认家庭' })
  createAnonymousIdentity() {
    return this.appAuthService.createAnonymousIdentity();
  }

  @Post('register')
  @ApiOperation({ summary: 'App 用户名密码注册，需系统注册码' })
  register(@Body() dto: RegisterAppUserDto) {
    return this.appAuthService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'App 用户名密码登录' })
  login(@Body() dto: LoginAppUserDto) {
    return this.appAuthService.login(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'App 刷新访问令牌' })
  refresh(@Body() dto: RefreshAppTokenDto) {
    return this.appAuthService.refresh(dto.refreshToken);
  }

  @Patch('profile')
  @ApiBearerAuth()
  @UseGuards(AppJwtAuthGuard)
  @ApiOperation({ summary: 'App 更新当前用户个人资料' })
  updateProfile(@Req() req: AppRequest, @Body() dto: UpdateAppProfileDto) {
    return this.appAuthService.updateProfile(req.user.appUserId, dto);
  }

  @Post('avatar')
  @ApiBearerAuth()
  @UseGuards(AppJwtAuthGuard)
  @ApiOperation({ summary: 'App 上传当前用户头像' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '头像图片',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadAvatar(
    @Req() req: AppRequest,
    @UploadedFile() file: BufferedFile,
  ) {
    this.validateAvatarFile(file);
    return this.appAuthService.uploadAvatar(req.user.appUserId, file);
  }

  private validateAvatarFile(file?: BufferedFile) {
    if (!file) {
      throw new BadRequestException('请选择头像图片');
    }

    if (!AppAuthController.ALLOWED_AVATAR_TYPES.has(file.mimetype)) {
      throw new BadRequestException('头像仅支持 JPG、PNG、WEBP、GIF、AVIF 格式');
    }

    if (file.size > AppAuthController.MAX_AVATAR_SIZE) {
      throw new BadRequestException('头像图片大小不能超过 5MB');
    }
  }
}
