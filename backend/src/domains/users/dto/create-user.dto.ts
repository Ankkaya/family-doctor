import { IsString, IsOptional, IsEmail, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    example: 'admin',
    description: '用户名，用于登录和唯一标识',
  })
  @IsString()
  @MinLength(3)
  username: string;

  @ApiProperty({
    example: 'user@example.com',
    required: false,
    description: '用户邮箱地址，可选',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    example: 'https://example.com/avatar.png',
    required: false,
    nullable: true,
    description: '用户头像地址，可选',
  })
  @IsString()
  @IsOptional()
  avatarUrl?: string | null;

  @ApiProperty({
    example: 'password123',
    description: '用户密码，最少6位字符',
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: '管理员',
    required: false,
    description: '用户姓名，可选',
  })
  @IsString()
  @IsOptional()
  name?: string;
}
