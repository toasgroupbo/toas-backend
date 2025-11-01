import { AuthProviders } from '../enums/providers.enum';

export interface IGooglePayload {
  provider: AuthProviders;
  idProvider: string;
  email: string;
  name: string;
}
