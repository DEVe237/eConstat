import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsNumber, IsOptional, Max, Min, ValidateNested } from 'class-validator';
import { CreateVehiculeDto } from './create-vehicule.dto';
import { CATEGORIES_DOCUMENT, CATEGORIES_MEDIA } from '../entities/media.entity';
import type { CategorieMedia, TypeMedia } from '../entities/media.entity';

/** Paramètres d'envoi d'un média : `POST /dossiers/:id/media?type=photo&categorie=plaque&conducteur=A`. */
export class AjoutMediaQuery {
  @IsIn(['photo', 'video'])
  type: TypeMedia;

  /** Étape de la capture guidée ; « libre » par défaut. */
  @IsOptional()
  @IsIn(CATEGORIES_MEDIA)
  categorie?: CategorieMedia;

  /** Obligatoire pour les plaques, vues véhicule et documents. */
  @IsOptional()
  @IsIn(['A', 'B'])
  conducteur?: 'A' | 'B';

  /** Durée annoncée par le téléphone, indicative : le serveur mesure la durée réelle. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(600)
  duree?: number;
}

export class DocumentAbsentDto {
  @IsIn(['A', 'B'])
  conducteur: 'A' | 'B';

  @IsIn(CATEGORIES_DOCUMENT)
  categorie: CategorieMedia;
}

export class DocumentsAbsentsDto {
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => DocumentAbsentDto)
  documents: DocumentAbsentDto[];
}

/** Remplace la liste des véhicules : le premier est A, le second B. */
export class VehiculesDto {
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CreateVehiculeDto)
  vehicules: CreateVehiculeDto[];
}
