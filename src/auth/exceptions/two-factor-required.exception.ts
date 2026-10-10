import { ForbiddenException } from '@nestjs/common';

//! 403 con error = TWO_FACTOR_REQUIRED para que el front lo distinga del 403 de permisos
//! y mande al usuario a activar el 2FA desde su perfil
export class TwoFactorRequiredException extends ForbiddenException {
  constructor() {
    super({
      statusCode: 403,
      error: 'TWO_FACTOR_REQUIRED',
      message: 'You must enable two-factor authentication to perform this action',
    });
  }
}
