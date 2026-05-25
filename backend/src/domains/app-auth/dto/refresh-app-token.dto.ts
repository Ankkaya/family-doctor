import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshAppTokenDto {
  @ApiProperty({ description: 'App refresh token' })
  @IsString()
  refreshToken!: string;
}
