import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { In, Repository } from 'typeorm';
import { RoleUtilisateur, User } from './entities/user.entity';

export type UserPublic = Omit<User, 'motDePasseHash'>;

@Injectable()
export class UsersService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly config: ConfigService,
  ) {}

  /**
   * Crée le premier compte administrateur à partir de ADMIN_EMAIL /
   * ADMIN_PASSWORD s'il n'existe pas encore : sans lui, personne ne pourrait
   * créer les comptes agents du dashboard.
   */
  async onApplicationBootstrap(): Promise<void> {
    const email = this.config.get<string>('ADMIN_EMAIL');
    const motDePasse = this.config.get<string>('ADMIN_PASSWORD');
    if (!email || !motDePasse) return;
    if (await this.findByEmail(email)) return;
    await this.create({
      nom: 'Administrateur',
      prenom: 'Système',
      email,
      role: 'administrateur',
      motDePasseHash: await bcrypt.hash(motDePasse, 10),
    });
    this.logger.log(`Compte administrateur initial créé (${email})`);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  create(data: Partial<User>): Promise<User> {
    const user = this.usersRepo.create(data);
    return this.usersRepo.save(user);
  }

  async listerParRoles(roles: RoleUtilisateur[]): Promise<UserPublic[]> {
    const users = await this.usersRepo.find({
      where: { role: In(roles) },
      order: { dateCreation: 'DESC' },
    });
    return users.map((u) => UsersService.publique(u));
  }

  async definirMotDePasse(id: string, motDePasseHash: string): Promise<void> {
    await this.usersRepo.update(id, { motDePasseHash });
  }

  /** Compagnies d'assurance ayant au moins un compte actif. */
  async compagnies(): Promise<string[]> {
    const lignes = await this.usersRepo
      .createQueryBuilder('u')
      .select('DISTINCT u.compagnie', 'compagnie')
      .where("u.role = 'assureur' AND u.actif = true AND u.compagnie IS NOT NULL")
      .orderBy('compagnie')
      .getRawMany<{ compagnie: string }>();
    return lignes.map((l) => l.compagnie);
  }

  async mettreAJour(id: string, data: Partial<Pick<User, 'role' | 'actif' | 'matricule' | 'unite' | 'compagnie' | 'motDePasseHash'>>): Promise<UserPublic | null> {
    const user = await this.findById(id);
    if (!user) return null;
    Object.assign(user, data);
    return UsersService.publique(await this.usersRepo.save(user));
  }

  /** Modification par l'intéressé : une valeur vide efface le champ facultatif. */
  async mettreAJourProfil(id: string, data: Partial<Pick<User, 'prenom' | 'nom' | 'telephone' | 'permisConduire' | 'adresse' | 'assurance'>>): Promise<UserPublic | null> {
    const user = await this.findById(id);
    if (!user) return null;
    if (data.prenom !== undefined) user.prenom = data.prenom!.trim();
    if (data.nom !== undefined) user.nom = data.nom!.trim();
    for (const champ of ['telephone', 'permisConduire', 'adresse', 'assurance'] as const) {
      if (data[champ] !== undefined) user[champ] = data[champ]?.trim() || null;
    }
    return UsersService.publique(await this.usersRepo.save(user));
  }

  static publique(user: User): UserPublic {
    const { motDePasseHash: _h, ...reste } = user;
    return reste;
  }
}
