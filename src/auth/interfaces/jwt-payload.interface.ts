import { LoginType } from '../../common/enums/login-type.enum';

export interface IJwtPayload {
  id: string;
  //email: string;
  type: LoginType;
}
