import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsUUID } from 'class-validator';
import { PlacesEnum } from '../enums/places.enum';

export class CreateOfficeDto {
  @ApiProperty({ example: 'Office 1' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Company UUID',
    example: '1acd78b9-2eb5-4bdd-8ebb-b87dac87b85a',
  })
  @IsUUID()
  @IsString()
  company: string;

  @ApiProperty({
    enum: PlacesEnum,
    example: PlacesEnum.SANTA_CRUZ_DE_LA_SIERRA,
  })
  @IsEnum(PlacesEnum)
  @IsString()
  place: PlacesEnum;
}
