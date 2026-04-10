/* import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateCompanyDto } from './create-company.dto';

export class UpdateCompanyDto extends PartialType(
  OmitType(CreateCompanyDto, ['manager' , 'bankAccount'] as const),
) {} */

import { PartialType, OmitType, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested, IsOptional } from 'class-validator';

import { CreateCompanyDto } from './create-company.dto';
import { UpdateBankAccountDto } from 'src/modules/bank-accounts/dto/update-bank-account.dto';

export class UpdateCompanyDto extends PartialType(
  OmitType(CreateCompanyDto, ['manager', 'bankAccount'] as const),
) {
  @ApiPropertyOptional({
    type: () => UpdateBankAccountDto,
    description: 'bank account of the company',
  })
  @ValidateNested()
  @Type(() => UpdateBankAccountDto)
  @IsOptional()
  bankAccount?: UpdateBankAccountDto;
}
