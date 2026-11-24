import { IsNotEmpty, IsString } from 'class-validator';

export class CreateSignatureDto {
  @IsNotEmpty()
  @IsString()
  conducteurNom: string;

  /** Image PNG encodée en base64 (sans préfixe data:...). */
  @IsNotEmpty()
  @IsString()
  imageBase64: string;
}
