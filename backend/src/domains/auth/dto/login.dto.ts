import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'admin',
    description: '用户名',
  })
  @IsString()
  username: string;

  @ApiProperty({
    description: '密码（前端使用 /auth/public-key 返回的 RSA 公钥加密后的 base64 字符串）',
    example: 'kJx9aB2c... (RSA-PKCS1 cipher base64)',
  })
  @IsString()
  password: string;
}
