import { PartialType, OmitType, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested, IsOptional } from 'class-validator';

import { CreateOwnerDto } from './create-owner.dto';
import { UpdateBankAccountDto } from 'src/modules/bank-accounts/dto/update-bank-account.dto';

export class UpdateOwnerDto extends PartialType(
  OmitType(CreateOwnerDto, ['bankAccount'] as const),
) {
  @ApiPropertyOptional({
    type: () => UpdateBankAccountDto,
    description: 'bank account of the owner',
  })
  @ValidateNested()
  @Type(() => UpdateBankAccountDto)
  @IsOptional()
  bankAccount?: UpdateBankAccountDto;
}
