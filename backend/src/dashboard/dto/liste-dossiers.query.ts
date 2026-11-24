import { Type } from 'class-transformer';
import { IsIn, IsISO8601, IsLatitude, IsLongitude, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import type { StatutDossier } from '../../dossiers/entities/dossier-constat.entity';

export const STATUTS_AUTORITES: StatutDossier[] = ['transmis', 'valide', 'conteste'];

/** Filtres de la liste des dossiers (cahier des charges §5.4 : date, zone, statut). */
export class ListeDossiersQuery {
  @IsOptional()
  @IsIn(STATUTS_AUTORITES)
  statut?: StatutDossier;

  /** Date d'accident minimale (incluse), ISO 8601. */
  @IsOptional()
  @IsISO8601()
  du?: string;

  /** Date d'accident maximale (incluse), ISO 8601. */
  @IsOptional()
  @IsISO8601()
  au?: string;

  /** Recherche libre : plaque, nom de conducteur ou début de numéro de dossier. */
  @IsOptional()
  @IsString()
  q?: string;

  /** Zone : centre + rayon en kilomètres. */
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  lng?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(500)
  rayonKm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limite?: number;
}
