import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { connexionPostgres, connexionRedis } from './common/configuration';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyseIaModule } from './analyse-ia/analyse-ia.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DossiersModule } from './dossiers/dossiers.module';
import { Simulation3dModule } from './simulation3d/simulation3d.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ...connexionPostgres(config),
        autoLoadEntities: true,
        // Projet en phase de conception : pas encore de migrations, le schéma
        // est synchronisé directement depuis les entités TypeORM.
        synchronize: true,
      }),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: connexionRedis(config),
      }),
    }),
    DossiersModule,
    UsersModule,
    AuthModule,
    Simulation3dModule,
    DashboardModule,
    AnalyseIaModule,
    CommonModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
