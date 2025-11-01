import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { META_PERMISSION } from '../decorators/permission.decorator';
import { META_RESOURCE } from '../decorators/resourse.decorator';

import { ValidResourses, ValidPermissions } from '../../common/enums';
import { StaticRoles } from '../enums/roles.enum';

import { User } from '../../modules/users/entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    //! se obtiene los metadatos de permiso y recurso
    const MetaPermissions = this.reflector.get<{
      permission: ValidPermissions[];
    }>(META_PERMISSION, context.getHandler());

    //! si no hay permisos definidos, permite el acceso solo con la authenticación
    if (!MetaPermissions?.permission?.length) {
      return true;
    }

    //! se obtiene el recurso, lo busca de la clase o en la función
    const MetaResource =
      this.reflector.get<ValidResourses>(META_RESOURCE, context.getClass()) ||
      //? Si no lo encuentra en la clase, lo busca en el handler
      this.reflector.get<ValidResourses>(META_RESOURCE, context.getHandler());

    if (!MetaResource) {
      throw new ForbiddenException('Recurso no definido para este endpoint');
    }

    //! se obtiene al usuario desde la request
    const req = context.switchToHttp().getRequest();
    const user: User = req.user;

    //! un customer no tiene permisos y no tiene rol
    if (!user) {
      throw new ForbiddenException('User is not authenticated');
    }

    if (!user?.rol?.permissions) {
      throw new ForbiddenException(
        'El usuario no tiene rol o el rol no tiene permisos definidos',
      );
    }

    //! Validar permisos
    const rol = user.rol;

    //! Si es super admin, tiene acceso a todo
    if (user.rol.name === StaticRoles.SUPER_ADMIN) {
      return true;
    }

    //! se verifica si el rol tiene permisos para el recurso
    const requiredPermissions = MetaPermissions.permission;
    const hasPermission = rol.permissions?.some((rolePermission) => {
      const matchesResource = rolePermission.resourse === MetaResource;
      const hasAllPermissions = requiredPermissions.every((perm) =>
        rolePermission.permissions.includes(perm),
      );
      return matchesResource && hasAllPermissions;
    });

    //! Si no tiene permisos, lanza una excepción
    if (!hasPermission) {
      throw new ForbiddenException(
        `No tienes los permisos requeridos [${requiredPermissions.join(', ')}] sobre el recurso [${MetaResource}]`,
      );
    }

    return true;
  }
}
