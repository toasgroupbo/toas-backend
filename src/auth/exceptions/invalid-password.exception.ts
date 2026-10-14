import { BadRequestException } from '@nestjs/common';

//! 400 (no 401) para que el front no cierre la sesión: la contraseña que se pide
//! para confirmar una edición estaba mal, pero el token sigue siendo válido
export class InvalidPasswordException extends BadRequestException {
  constructor() {
    super({
      statusCode: 400,
      error: 'INVALID_PASSWORD',
      message: 'Current password is incorrect',
    });
  }
}
