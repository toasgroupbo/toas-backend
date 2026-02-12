import { ApiProperty } from '@nestjs/swagger';

export class CollectorDto {
  @ApiProperty()
  Name: string;

  @ApiProperty()
  Parameter: string;

  @ApiProperty()
  Value: string;
}
