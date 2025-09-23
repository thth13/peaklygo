import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PremiumType {
  MONTHLY = 'monthly',
  YEAR = 'year',
}

export class GetPremiumDto {
  @ApiProperty({
    description: 'Premium subscription type',
    enum: PremiumType,
    example: PremiumType.YEAR,
  })
  @IsNotEmpty()
  @IsEnum(PremiumType)
  type: PremiumType;
}
