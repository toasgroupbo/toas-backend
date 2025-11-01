import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, ValidateNested } from 'class-validator';

import { CreateBankAccountDto } from 'src/modules/bank-accounts/dto/create-bank-account.dto';

export class CreateOwnerDto {
  @ApiProperty({
    example: 'name owner',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: '98234679',
  })
  @IsString()
  ci: string;

  @ApiProperty({
    example: '78652452',
  })
  @IsString()
  phone: string;

  @ApiProperty({
    type: () => CreateBankAccountDto,
    description: 'bank account of the company',
  })
  @ValidateNested({ each: true })
  @Type(() => CreateBankAccountDto)
  bankAccount: CreateBankAccountDto;
}
