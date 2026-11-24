import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateVehiculeDto {
  @IsNotEmpty()
  @IsString()
  conducteurNom: string;

  @IsNotEmpty()
  @IsString()
  plaque: string;

  @IsOptional()
  @IsString()
  marque?: string;

  @IsOptional()
  @IsString()
  vitesseEstimee?: string;

  @IsOptional()
  @IsString()
  sensCirculation?: string;

  @IsOptional()
  @IsString()
  zoneChoc?: string;
}
