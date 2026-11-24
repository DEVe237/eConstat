import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { RoleUtilisateur } from '../users/entities/user.entity';
import type { JwtPayload } from './jwt.strategy';
import { ROLES_KEY } from './roles.decorator';

/** Contrôle d'accès par rôle (cahier de conception §8 : usager / agent / administrateur). */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<RoleUtilisateur[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;
    const user = context.switchToHttp().getRequest<{ user?: JwtPayload }>().user;
    if (!user || !roles.includes(user.role as RoleUtilisateur)) {
      throw new ForbiddenException('Accès réservé aux autorités');
    }
    return true;
  }
}
