import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

export enum MedicineOtcType {
  OTC = 'OTC',
  RX = 'RX',
}

export class UpsertMedicineDto {
  @ApiProperty({ description: '药品名称' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: '别名/通用名/商品名' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  aliases?: string[];

  @ApiProperty({ enum: MedicineOtcType, description: '分类：OTC(非处方药) 或 RX(处方药)' })
  @IsEnum(MedicineOtcType)
  otc!: MedicineOtcType;

  @ApiProperty({ description: '适应症' })
  @IsString()
  indication!: string;

  @ApiPropertyOptional({ description: '禁忌人群' })
  @IsOptional()
  @IsString()
  contraindication?: string;

  @ApiPropertyOptional({ description: '不良反应' })
  @IsOptional()
  @IsString()
  adverseReaction?: string;

  @ApiPropertyOptional({ description: '用法用量' })
  @IsOptional()
  @IsString()
  dosage?: string;

  @ApiPropertyOptional({ description: '条形码' })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional({ description: '批准文号' })
  @IsOptional()
  @IsString()
  approvalNumber?: string;
}
