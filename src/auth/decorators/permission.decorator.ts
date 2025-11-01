import { SetMetadata } from '@nestjs/common';
import { ValidPermissions } from '../../common/enums';

export const META_PERMISSION = 'permission'; // nombre de la metadata

export const Permissions = (...permission: ValidPermissions[]) => {
  return SetMetadata(META_PERMISSION, { permission });
};
