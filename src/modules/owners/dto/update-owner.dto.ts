import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateOwnerDto } from './create-owner.dto';

export class UpdateOwnerDto extends PartialType(
  OmitType(CreateOwnerDto, ['bankAccount'] as const),
) {}
