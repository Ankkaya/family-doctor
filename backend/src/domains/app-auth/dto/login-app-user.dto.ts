import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginAppUserDto {
  @ApiProperty({ description: '用户名', example: 'alice' })
  @IsString({ message: '用户名格式不正确' })
  @IsNotEmpty({ message: '请输入用户名' })
  @MinLength(1, { message: '请输入用户名' })
  @MaxLength(32, { message: '用户名不能超过 32 个字符' })
  username!: string;

  @ApiProperty({ description: '密码' })
  @IsString({ message: '密码格式不正确' })
  @IsNotEmpty({ message: '请输入密码' })
  @MinLength(1, { message: '请输入密码' })
  @MaxLength(72, { message: '密码不能超过 72 个字符' })
  password!: string;
}
