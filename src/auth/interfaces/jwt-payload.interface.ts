import { LoginType } from '../../common/enums/login-type.enum';

export interface IJwtPayload {
  id: number; //! 0 en el token de invitado (no tiene fila en BD)
  type: LoginType;
  twoFactorPending?: boolean; //! solo presente en el token temporal del login con 2FA
}
