import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

/**
 * @CurrentUser() — Extrae el usuario del JWT inyectado por Passport.
 * Uso: @CurrentUser() user: JwtPayload
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

/**
 * @Roles('ADMIN', 'SUPERVISOR') — Metadato de roles requeridos.
 * Se usa junto con RolesGuard.
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
