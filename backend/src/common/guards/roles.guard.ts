import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators';

/**
 * RolesGuard — Verifica que el usuario tenga al menos uno de los roles requeridos.
 * Se usa con el decorador @Roles('ADMIN', 'CONDUCTOR').
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true; // No roles required → allow
    }
    const { user } = context.switchToHttp().getRequest();
    if (!user?.roles) {
      return false;
    }
    return requiredRoles.some((role) => user.roles.includes(role));
  }
}
