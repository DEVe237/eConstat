import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Body, Controller, ForbiddenException, Get, HttpCode, NotFoundException, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangerMotDePasseDto } from './dto/mot-de-passe.dto';
import { ProfilDto } from './dto/profil.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { COOKIE_SESSION, JwtPayload } from './jwt.strategy';

const SEPT_JOURS = 7 * 24 * 60 * 60 * 1000;

@ApiTags('Authentification')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /**
   * Renvoie le jeton (application mobile) et pose aussi un cookie httpOnly
   * SameSite=Strict pour le dashboard web, qui n'a ainsi jamais le jeton
   * entre les mains.
   */
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const resultat = await this.authService.login(dto);
    res.cookie(COOKIE_SESSION, resultat.accessToken, {
      httpOnly: true,
      sameSite: 'strict',
      // HTTPS obligatoire en production ; COOKIE_SECURE=false seulement pour un test local en HTTP.
      secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production',
      maxAge: SEPT_JOURS,
      path: '/',
    });
    return resultat;
  }

  @Post('deconnexion')
  @HttpCode(204)
  deconnexion(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_SESSION, { path: '/' });
  }

  @Get('moi')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async moi(@Req() req: Request & { user: JwtPayload }) {
    const user = await this.usersService.findById(req.user.sub);
    if (!user || user.actif === false) throw new NotFoundException('Compte introuvable');
    return UsersService.publique(user);
  }

  /** Le conducteur modifie son profil ; les comptes du dashboard sont gérés par l'administrateur. */
  @Patch('moi')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async modifierProfil(@Req() req: Request & { user: JwtPayload }, @Body() dto: ProfilDto) {
    if (req.user.role !== 'usager') throw new ForbiddenException('Ce compte est géré par un administrateur');
    const user = await this.usersService.mettreAJourProfil(req.user.sub, dto);
    if (!user) throw new NotFoundException('Compte introuvable');
    return user;
  }

  @Post('mot-de-passe')
  @HttpCode(204)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async changerMotDePasse(@Req() req: Request & { user: JwtPayload }, @Body() dto: ChangerMotDePasseDto) {
    await this.authService.changerMotDePasse(req.user.sub, dto.actuel, dto.nouveau);
  }
}
