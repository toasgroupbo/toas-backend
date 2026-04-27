import { IsOptional, IsString } from 'class-validator';

export class AppleLoginDto {
  @IsString()
  identityToken: string;

  @IsOptional()
  @IsString()
  fullName?: string | null;
}
