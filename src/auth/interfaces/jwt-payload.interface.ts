import { LoginType } from '../../common/enums/login-type.enum';

export interface IJwtPayload {
  id: number;
  type: LoginType;
}
