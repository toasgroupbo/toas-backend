import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

import { BankCode } from '../enums/bank-code.enum';

import {
  DocumentType,
  BranchOfficeId,
  DocumentExtension,
} from '../entities/bank-account.entity';

export class CreateBankAccountDto {
  @ApiProperty({
    enum: BankCode,
    example: BankCode.BANCO_DE_CREDITO,
  })
  @IsEnum(BankCode)
  bankCode: BankCode;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  account: string;

  @ApiProperty({
    enum: BankCode,
    example: BankCode.BANCO_DE_CREDITO,
  })
  @IsEnum(BankCode)
  titularName: string;

  @ApiProperty({
    enum: BranchOfficeId,
    example: BranchOfficeId.LA_PAZ,
  })
  @IsEnum(BranchOfficeId)
  branchOfficeId: BranchOfficeId;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  documentNumber: string;

  @ApiProperty({
    enum: DocumentType,
    example: DocumentType.CI,
  })
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @ApiPropertyOptional({
    enum: DocumentExtension,
    example: DocumentExtension.CH,
  })
  @IsEnum(DocumentExtension)
  @IsOptional()
  documentExtension?: DocumentExtension;
}
