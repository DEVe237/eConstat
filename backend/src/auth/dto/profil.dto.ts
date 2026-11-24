import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/** Champs que le conducteur peut modifier lui-même (ni e-mail, ni rôle). */
export class ProfilDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  prenom?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telephone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  permisConduire?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  adresse?: string;

  /** Assureur et numéro de contrat. */
  @IsOptional()
  @IsString()
  @MaxLength(160)
  assurance?: string;
}
