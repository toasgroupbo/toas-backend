import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDefined, ValidateNested } from 'class-validator';

import { BillingDto } from './billing.dto';

export class AssignBillingDto {
  @ApiProperty({
    type: BillingDto,
  })
  @ValidateNested()
  @Type(() => BillingDto)
  @IsDefined()
  billing: BillingDto;
}
