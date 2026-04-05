import { IsObject, IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class EncryptRequestDto {
  @IsObject()
  @IsNotEmpty()
  payload: Record<string, any>;
}

export class DecryptRequestDto {
  @IsString()
  @IsNotEmpty()
  data: string;

  @IsString()
  @IsOptional()
  signature?: string;
}

export class SignRequestDto {
  @IsString()
  @IsNotEmpty()
  data: string;
}

export class VerifySignatureDto {
  @IsString()
  @IsNotEmpty()
  data: string;

  @IsString()
  @IsNotEmpty()
  signature: string;
}
