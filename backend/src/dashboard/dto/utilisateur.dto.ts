import { IsBoolean, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';
import type { RoleUtilisateur } from '../../users/entities/user.entity';

export const ROLES_DASHBOARD: RoleUtilisateur[] = ['agent', 'administrateur', 'assureur'];

export class CreerAgentDto {
  @IsString()
  nom: string;

  @IsString()
  prenom: string;

  @IsEmail()
  email: string;

  @MinLength(8)
  motDePasse: string;

  @IsIn(ROLES_DASHBOARD)
  role: RoleUtilisateur;

  @IsOptional()
  @IsString()
  telephone?: string;

  @IsOptional()
  @IsString()
  matricule?: string;

  @IsOptional()
  @IsString()
  unite?: string;

  /** Obligatoire pour un compte assureur : il ne verra que les dossiers transmis à cette compagnie. */
  @ValidateIf((o: CreerAgentDto) => o.role === 'assureur')
  @IsString()
  @IsNotEmpty()
  compagnie?: string;
}

export class ModifierAgentDto {
  @IsOptional()
  @IsIn(ROLES_DASHBOARD)
  role?: RoleUtilisateur;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;

  @IsOptional()
  @IsString()
  matricule?: string;

  @IsOptional()
  @IsString()
  unite?: string;

  @IsOptional()
  @IsString()
  compagnie?: string;

  /** Réinitialisation par l'administrateur (mot de passe provisoire). */
  @IsOptional()
  @MinLength(8)
  motDePasse?: string;
}
