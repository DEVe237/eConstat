import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import type { Responsabilite } from '../../dossiers/entities/dossier-constat.entity';

export const RESPONSABILITES: Responsabilite[] = ['A', 'B', 'partagee', 'indeterminee'];

/** Validation d'un dossier : conclusion obligatoire et justifiée. */
export class ValiderDto {
  /** A = conducteur A responsable, B = conducteur B, partagee, indeterminee. */
  @IsIn(RESPONSABILITES)
  responsabilite: Responsabilite;

  /** Obligatoire si la responsabilité est partagée : part du conducteur A en % (1 à 99). */
  @ValidateIf((o: ValiderDto) => o.responsabilite === 'partagee')
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  partResponsabiliteA?: number;

  /** Justification de la conclusion, obligatoire. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  commentaire: string;
}

export class MotifDto {
  /** Motif de contestation ou contenu du complément, obligatoire. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  commentaire: string;
}
