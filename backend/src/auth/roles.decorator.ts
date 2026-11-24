import { SetMetadata } from '@nestjs/common';
import type { RoleUtilisateur } from '../users/entities/user.entity';

export const ROLES_KEY = 'roles';

/** Restreint une route aux rôles indiqués (à combiner avec JwtAuthGuard + RolesGuard). */
export const Roles = (...roles: RoleUtilisateur[]) => SetMetadata(ROLES_KEY, roles);
