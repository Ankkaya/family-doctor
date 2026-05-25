import { IsString, IsOptional, IsEmail, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
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
    description: '用户头像地址，可选，传 null 可清空',
  })
  @IsString()
  @IsOptional()
  avatarUrl?: string | null;

  @ApiProperty({
    example: 'newpassword123',
    required: false,
    description: '用户新密码，最少6位字符，可选',
  })
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @ApiProperty({
    example: '张三',
    required: false,
    description: '用户姓名，可选',
  })
  @IsString()
  @IsOptional()
  name?: string;
}
