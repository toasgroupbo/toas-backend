import { ApiProperty } from '@nestjs/swagger';

import { IsBoolean } from 'class-validator';

export class TravelApprovalSettingDto {
  @ApiProperty({
    example: true,
    description:
      'Si es true, los viajes creados por cajeros requieren aprobación del admin de empresa',
  })
  @IsBoolean()
  enabled: boolean;
}
