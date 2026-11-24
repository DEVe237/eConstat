import { IsString, MinLength } from 'class-validator';

export class ChangerMotDePasseDto {
  @IsString()
  actuel: string;

  @MinLength(8)
  nouveau: string;
}
