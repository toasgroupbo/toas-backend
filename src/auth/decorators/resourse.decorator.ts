import { SetMetadata } from '@nestjs/common';
import { ValidResourses } from '../../common/enums';

export const META_RESOURCE = 'resource'; // nombre de la metadata

export const Resource = (resource: ValidResourses) =>
  SetMetadata(META_RESOURCE, resource);
