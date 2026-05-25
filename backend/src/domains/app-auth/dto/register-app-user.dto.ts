import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterAppUserDto {
  @ApiProperty({ description: '用户名', example: 'alice' })
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: '用户名只能包含字母、数字和下划线' })
  username!: string;

  @ApiProperty({ description: '密码', minLength: 6 })
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password!: string;

  @ApiProperty({ description: '系统注册码', example: 'REG2026' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  registrationCode!: string;
}
