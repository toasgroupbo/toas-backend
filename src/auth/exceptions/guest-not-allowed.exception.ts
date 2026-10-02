import { ForbiddenException } from '@nestjs/common';

//! 403 (no 401) para que el front no lo trate como sesión vencida:
//! con error = GUEST_NOT_ALLOWED la app muestra "inicia sesión para continuar"
export class GuestNotAllowedException extends ForbiddenException {
  constructor() {
    super({
      statusCode: 403,
      error: 'GUEST_NOT_ALLOWED',
      message: 'Login required: guests cannot perform this action',
    });
  }
}
