import { config } from 'dotenv';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { MIGRATIONS } from '../migrations';
import { connexionPostgres } from './configuration';

config({ quiet: true });

/** Connexion utilisée par les commandes `npm run migration:*` (jamais par l'API). */
export default new DataSource({
  ...connexionPostgres(new ConfigService()),
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
  migrations: MIGRATIONS,
  synchronize: false,
});
