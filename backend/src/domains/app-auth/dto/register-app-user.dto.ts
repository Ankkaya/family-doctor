import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterAppUserDto {
  @ApiProperty({ description: '用户名', example: 'alice' })
  @IsString({ message: '用户名格式不正确' })
  @IsNotEmpty({ message: '请输入用户名' })
  @MinLength(3, { message: '用户名至少 3 个字符' })
  @MaxLength(32, { message: '用户名不能超过 32 个字符' })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: '用户名只能包含字母、数字和下划线' })
  username!: string;

  @ApiProperty({ description: '密码', minLength: 6 })
  @IsString({ message: '密码格式不正确' })
  @IsNotEmpty({ message: '请输入密码' })
  @MinLength(6, { message: '密码至少 6 个字符' })
  @MaxLength(72, { message: '密码不能超过 72 个字符' })
  password!: string;

  @ApiProperty({ description: '系统注册码', example: 'REG2026' })
  @IsString({ message: '注册码格式不正确' })
  @IsNotEmpty({ message: '请输入注册码' })
  @MinLength(1, { message: '请输入注册码' })
  @MaxLength(64, { message: '注册码不能超过 64 个字符' })
  registrationCode!: string;
}
