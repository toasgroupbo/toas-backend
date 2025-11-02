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
    // --------------------------------------------------------------------------
    // 1. Obtención de Metadatos (Permisos)
    // --------------------------------------------------------------------------

    const MetaPermissions = this.reflector.get<{
      permission: ValidPermissions[];
    }>(META_PERMISSION, context.getHandler());

    // --------------------------------------------------------------------------
    // 2. Si no hay permisos requeridos, permite el acceso
    // --------------------------------------------------------------------------

    if (!MetaPermissions?.permission?.length) {
      return true;
    }

    // --------------------------------------------------------------------------
    // 3. Obtención de Metadatos (Recurso)
    // --------------------------------------------------------------------------

    const MetaResource =
      this.reflector.get<ValidResourses>(META_RESOURCE, context.getClass()) ||
      //? Si no lo encuentra en la clase, lo busca en el handler
      this.reflector.get<ValidResourses>(META_RESOURCE, context.getHandler());

    if (!MetaResource) {
      throw new ForbiddenException('Recurso no definido para este endpoint');
    }

    // --------------------------------------------------------------------------
    // 4. Obtención del usuario desde el request
    // --------------------------------------------------------------------------

    const req = context.switchToHttp().getRequest();
    const user: User = req.user;

    // --------------------------------------------------------------------------
    // 3. Validación de Usuario y Rol
    // --------------------------------------------------------------------------

    if (!user) {
      throw new ForbiddenException('User is not authenticated');
    }

    if (!user?.rol?.permissions) {
      throw new ForbiddenException(
        'El usuario no tiene rol o el rol no tiene permisos definidos',
      );
    }

    // --------------------------------------------------------------------------
    // 4. Validación de Permisos
    // --------------------------------------------------------------------------

    const rol = user.rol;

    //! Si es super admin, tiene acceso a todo
    /* if (user.rol.name === StaticRoles.SUPER_ADMIN) {
      return true;
    } */

    const requiredPermissions = MetaPermissions.permission;
    const hasPermission = rol.permissions?.some((rolePermission) => {
      const matchesResource = rolePermission.resourse === MetaResource;
      const hasAllPermissions = requiredPermissions.every((perm) =>
        rolePermission.permissions.includes(perm),
      );
      return matchesResource && hasAllPermissions;
    });

    // --------------------------------------------------------------------------
    // 5. Si no tiene los permisos requeridos, lanza una excepción
    // --------------------------------------------------------------------------
    if (!hasPermission) {
      throw new ForbiddenException(
        `No tienes los permisos requeridos [${requiredPermissions.join(', ')}] sobre el recurso [${MetaResource}]`,
      );
    }

    return true;
  }
}

/* 
| Decorador                                                 | Requiere login   | Requiere rol/permisos |
| --------------------------------------------------------- | --------------   | --------------------- |
| `@Auth()`                                                 | ✅ Sí           | ❌ No                  |
| `@Auth(ValidPermissions.READ)`                            | ✅ Sí           | ✅ Sí (permiso `READ`) |
| `@Auth(ValidPermissions.CREATE, ValidPermissions.UPDATE)` | ✅ Sí           | ✅ Sí (ambos permisos) |
*/
