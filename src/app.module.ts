import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SportsModule } from './sports/sports.module';
import { BallsModule } from './balls/balls.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { PhasesModule } from './phases/phases.module';
import { RegistrationsModule } from './registrations/registrations.module';
import { TeamsModule } from './teams/teams.module';
import { TeamSportsModule } from './team-sports/team-sports.module';
import { VenuesModule } from './venues/venues.module';
import { LocationsModule } from './locations/locations.module';
import { TournamentVenuesModule } from './tournament-venues/tournament-venues.module';
import { PlayersModule } from './players/players.module';
import { SkillsModule } from './skills/skills.module';
import { TeamPlayersModule } from './team-players/team-players.module';
import { PlayerSkillsModule } from './player-skills/player-skills.module';
import { TeamRelationsModule } from './team-relations/team-relations.module';
import { PlayerProfilesModule } from './player-profiles/player-profiles.module';
import { SecurityModule } from './security/security.module';
import { MatchesModule } from './matches/matches.module';
import { MatchPositionsModule } from './match-positions/match-positions.module';
import { GoalsModule } from './goals/goals.module';
import { FansModule } from './fans/fans.module';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql' as const,
        host: configService.getOrThrow<string>('DB_HOST'),
        port: Number(configService.getOrThrow<string>('DB_PORT')),
        username: configService.getOrThrow<string>('DB_USER'),
        password: configService.getOrThrow<string>('DB_PASS'),
        database: configService.getOrThrow<string>('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
      }),
    }),
    SportsModule,
    BallsModule,
    TournamentsModule,
    PhasesModule,
    RegistrationsModule,
    TeamsModule,
    TeamSportsModule,
    VenuesModule,
    LocationsModule,
    TournamentVenuesModule,
    PlayersModule,
    SkillsModule,
    TeamPlayersModule,
    PlayerSkillsModule,
    TeamRelationsModule,
    PlayerProfilesModule,
    MatchesModule,
    MatchPositionsModule,
    GoalsModule,
    FansModule,
    PaymentMethodsModule,
    // Guard global: todas las rutas pasan por ms_security salvo las @Public()
    SecurityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
