import { IsISO8601, IsLatitude, IsLongitude, IsOptional, IsString } from 'class-validator';

export class CreateDossierDto {
  @IsOptional()
  @IsISO8601()
  dateAccident?: string;

  @IsOptional()
  @IsLatitude()
  lat?: number;

  @IsOptional()
  @IsLongitude()
  lng?: number;

  @IsOptional()
  @IsString()
  pointDeChoc?: string;

  @IsOptional()
  @IsString()
  conditionsMeteo?: string;
}
