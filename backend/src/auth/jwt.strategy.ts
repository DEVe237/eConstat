import { secretJwt } from '../common/configuration';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

/** Cookie de session du dashboard web (httpOnly : jamais lisible par le JavaScript de la page). */
export const COOKIE_SESSION = 'camairconst_session';

const depuisCookie = (req: Request): string | null => {
  const brut = req?.headers?.cookie;
  if (!brut) return null;
  for (const morceau of brut.split(';')) {
    const [nom, ...valeur] = morceau.trim().split('=');
    if (nom === COOKIE_SESSION) return decodeURIComponent(valeur.join('='));
  }
  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      // Application mobile : en-tête Authorization. Dashboard web : cookie httpOnly.
      jwtFromRequest: ExtractJwt.fromExtractors([ExtractJwt.fromAuthHeaderAsBearerToken(), depuisCookie]),
      ignoreExpiration: false,
      secretOrKey: secretJwt(config),
    });
  }

  /**
   * Vérifie le compte à chaque requête : un agent désactivé perd l'accès
   * immédiatement, et un changement de rôle est pris en compte sans attendre
   * l'expiration du jeton.
   */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.usersService.findById(payload.sub);
    if (!user || user.actif === false) throw new UnauthorizedException('Compte désactivé ou introuvable');
    return { sub: user.id, email: user.email, role: user.role };
  }
}
