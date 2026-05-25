import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginAppUserDto {
  @ApiProperty({ description: '用户名', example: 'alice' })
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  username!: string;

  @ApiProperty({ description: '密码' })
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password!: string;
}
