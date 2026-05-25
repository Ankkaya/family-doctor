import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResetUserPasswordDto {
  @ApiProperty({
    example: 'newpassword123',
    description: '用户新密码，最少6位字符',
  })
  @IsString()
  @MinLength(6)
  password: string;
}
