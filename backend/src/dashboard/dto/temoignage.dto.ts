import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class TemoignageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  temoinNom: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  temoinTelephone?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  recit: string;
}

export class TransmissionAssureurDto {
  @IsString()
  @IsNotEmpty()
  compagnie: string;

  /** Remarque de l'agent à l'attention de la compagnie. */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  remarque?: string;
}
