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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
