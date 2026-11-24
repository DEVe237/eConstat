import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BadRequestException, Body, ConflictException, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UsersService } from '../users/users.service';
import { CreerAgentDto, ModifierAgentDto, ROLES_DASHBOARD } from './dto/utilisateur.dto';

/** Gestion des comptes du dashboard (acteur « Administrateur système », cahier des charges §4). */
@ApiTags('Administration des comptes')
@ApiBearerAuth()
@Controller('admin/utilisateurs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('administrateur')
export class AdminUtilisateursController {
  constructor(private readonly users: UsersService) {}

  @Get()
  lister() {
    return this.users.listerParRoles(ROLES_DASHBOARD);
  }

  @Post()
  async creer(@Body() dto: CreerAgentDto) {
    if (await this.users.findByEmail(dto.email)) throw new ConflictException('Cet email est déjà utilisé');
    const { motDePasse, ...reste } = dto;
    const user = await this.users.create({
      ...reste,
      telephone: reste.telephone ?? null,
      matricule: reste.matricule ?? null,
      unite: reste.unite ?? null,
      compagnie: reste.role === 'assureur' ? reste.compagnie!.trim() : null,
      motDePasseHash: await bcrypt.hash(motDePasse, 10),
    });
    return UsersService.publique(user);
  }

  @Patch(':id')
  async modifier(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ModifierAgentDto, @Req() req: Request & { user: JwtPayload }) {
    if (id === req.user.sub && (dto.actif === false || (dto.role && dto.role !== 'administrateur'))) {
      throw new BadRequestException('Vous ne pouvez pas désactiver ni rétrograder votre propre compte');
    }
    const { motDePasse, ...reste } = dto;
    const user = await this.users.mettreAJour(id, {
      ...reste,
      ...(motDePasse ? { motDePasseHash: await bcrypt.hash(motDePasse, 10) } : {}),
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }
}
