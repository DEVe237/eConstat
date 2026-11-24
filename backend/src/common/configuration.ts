import type { ConfigService } from '@nestjs/config';

const SECRET_DEV = 'dev-secret-change-me';

/**
 * Secret de signature des sessions et des liens de fichiers. Le code source
 * étant public, la valeur de développement ne doit jamais servir en
 * production : n'importe qui pourrait fabriquer une session administrateur.
 */
export function secretJwt(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET')?.trim();
  if (process.env.NODE_ENV === 'production' && (!secret || secret.length < 32 || secret === SECRET_DEV)) {
    throw new Error('JWT_SECRET est obligatoire en production (32 caractères aléatoires au minimum)');
  }
  return secret || SECRET_DEV;
}

/** Connexion PostgreSQL : DATABASE_URL (hébergeurs type Railway) ou variables séparées. */
export function connexionPostgres(config: ConfigService) {
  const url = config.get<string>('DATABASE_URL')?.trim();
  const ssl = config.get<string>('DATABASE_SSL') === 'true' ? { ssl: true } : {};
  if (url) return { type: 'postgres' as const, url, ...ssl };
  return {
    type: 'postgres' as const,
    host: config.get<string>('DATABASE_HOST', 'localhost'),
    port: Number(config.get('DATABASE_PORT', 5432)),
    username: config.get<string>('DATABASE_USER', 'camaircost'),
    password: config.get<string>('DATABASE_PASSWORD', 'camaircost_dev'),
    database: config.get<string>('DATABASE_NAME', 'camaircost'),
    ...ssl,
  };
}

/** Connexion Redis : REDIS_URL ou variables séparées. */
export function connexionRedis(config: ConfigService) {
  const url = config.get<string>('REDIS_URL')?.trim();
  if (!url) return { host: config.get<string>('REDIS_HOST', 'localhost'), port: Number(config.get('REDIS_PORT', 6380)) };
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    ...(u.pathname.length > 1 ? { db: Number(u.pathname.slice(1)) || 0 } : {}),
    ...(u.username ? { username: decodeURIComponent(u.username) } : {}),
    ...(u.password ? { password: decodeURIComponent(u.password) } : {}),
    ...(u.protocol === 'rediss:' ? { tls: {} } : {}),
    // Réseau privé de certains hébergeurs en IPv6 uniquement : on accepte les deux familles.
    family: 0,
  };
}
