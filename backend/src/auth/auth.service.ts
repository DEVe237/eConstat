import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const SALT_ROUNDS = 10;

export interface AuthResult {
  accessToken: string;
  user: Omit<User, 'motDePasseHash'>;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existant = await this.usersService.findByEmail(dto.email);
    if (existant) throw new ConflictException('Cet email est déjà utilisé');

    const motDePasseHash = await bcrypt.hash(dto.motDePasse, SALT_ROUNDS);
    const user = await this.usersService.create({
      nom: dto.nom,
      prenom: dto.prenom,
      email: dto.email,
      telephone: dto.telephone ?? null,
      permisConduire: dto.permisConduire ?? null,
      motDePasseHash,
    });
    return this._emettreToken(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Identifiants invalides');

    const motDePasseValide = await bcrypt.compare(dto.motDePasse, user.motDePasseHash);
    if (!motDePasseValide) throw new UnauthorizedException('Identifiants invalides');
    if (user.actif === false) throw new UnauthorizedException('Compte désactivé');

    return this._emettreToken(user);
  }

  private _emettreToken(user: User): AuthResult {
    const { motDePasseHash: _motDePasseHash, ...userSansMotDePasse } = user;
    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    return { accessToken, user: userSansMotDePasse };
  }

  async changerMotDePasse(userId: string, actuel: string, nouveau: string): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user || !(await bcrypt.compare(actuel, user.motDePasseHash))) {
      throw new UnauthorizedException('Mot de passe actuel incorrect');
    }
    await this.usersService.definirMotDePasse(userId, await bcrypt.hash(nouveau, SALT_ROUNDS));
  }
}
