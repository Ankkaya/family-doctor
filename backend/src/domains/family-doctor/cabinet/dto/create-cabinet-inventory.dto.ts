import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsISO8601, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MedicineOtcType } from '../../medicine/dto/upsert-medicine.dto';

export class CreateCabinetInventoryDto {
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

  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 999 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(999)
  quantity?: number = 1;

  @ApiPropertyOptional({ description: '有效期，YYYY-MM-DD' })
  @IsOptional()
  @IsISO8601({ strict: true })
  expireAt?: string;

  @ApiPropertyOptional({ description: '来源：manual/image/barcode/admin' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  notes?: string;
}
