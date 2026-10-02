import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

import { TwoFactorCodeDto } from './two-factor-code.dto';

export class VerifyTwoFactorLoginDto extends TwoFactorCodeDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIs...',
    description: 'tempToken devuelto por POST auth/login',
  })
  @IsString()
  tempToken: string;
}
