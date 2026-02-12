import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested, IsArray, IsOptional } from 'class-validator';
import { CollectorDto } from './collector.dto';

export class QrCallbackDto {
  @ApiProperty()
  IdCorrelation: string;

  @ApiProperty()
  Id: number;

  @ApiProperty()
  ServiceCode: string;

  @ApiProperty()
  BusinessCode: string;

  @ApiProperty()
  IdQr: string;

  @ApiProperty({ required: false })
  @IsOptional()
  Eif?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  Account?: string;

  @ApiProperty()
  Amount: number;

  @ApiProperty()
  Currency: string;

  @ApiProperty()
  Gloss: string;

  @ApiProperty()
  ReceiverAccount: string;

  @ApiProperty()
  ReceiverName: string;

  @ApiProperty()
  ReceiverDocument: string;

  @ApiProperty()
  ReceiverBank: string;

  @ApiProperty()
  Status: string;

  @ApiProperty()
  RequestDate: string;

  @ApiProperty()
  State: boolean;

  @ApiProperty()
  CorrelationId: string;

  @ApiProperty()
  Description: string;

  @ApiProperty()
  GenerateType: number;

  @ApiProperty()
  Version: string;

  @ApiProperty()
  SingleUse: boolean;

  @ApiProperty()
  OperationNumber: string;

  @ApiProperty()
  City: string;

  @ApiProperty()
  BranchOffice: string;

  @ApiProperty()
  Teller: string;

  @ApiProperty()
  PhoneNumber: string;

  @ApiProperty({ type: [CollectorDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CollectorDto)
  Collectors: CollectorDto[];
}
