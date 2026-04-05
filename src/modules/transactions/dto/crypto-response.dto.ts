export class CryptoResponseDto {
  success: boolean;
  data?: any;
  signature?: string;
  error?: string;
  isValid?: boolean;
}

export class EncryptResponseDto {
  success: boolean;
  data?: string;
  signature?: string;
  error?: string;
}

export class DecryptResponseDto {
  success: boolean;
  data?: any;
  error?: string;
}
