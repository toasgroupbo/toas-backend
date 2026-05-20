import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateOfficeDto } from './create-office.dto';

export class UpdateOfficeDto extends PartialType(OmitType(CreateOfficeDto, ['placeId'] as const)) {}
