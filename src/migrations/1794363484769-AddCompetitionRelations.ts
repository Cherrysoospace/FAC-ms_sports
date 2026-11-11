import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCompetitionRelations1794363484769 implements MigrationInterface {
    name = 'AddCompetitionRelations1794363484769'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`registrations\` (\`id\` int NOT NULL AUTO_INCREMENT, \`registered_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`status\` enum ('ACTIVE', 'WITHDRAWN') NOT NULL DEFAULT 'ACTIVE', \`withdrawn_at\` datetime NULL, \`tournament_id\` int NOT NULL, \`team_id\` int NOT NULL, UNIQUE INDEX \`UQ_registrations_tournament_team\` (\`tournament_id\`, \`team_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`teams\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(120) NOT NULL, \`city\` varchar(80) NOT NULL, \`modality\` enum ('MALE', 'FEMALE', 'MIXED') NOT NULL, \`active\` tinyint NOT NULL DEFAULT 1, UNIQUE INDEX \`UQ_teams_name_modality\` (\`name\`, \`modality\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`team_sports\` (\`id\` int NOT NULL AUTO_INCREMENT, \`team_id\` int NOT NULL, \`sport_id\` int NOT NULL, UNIQUE INDEX \`UQ_team_sports_team_sport\` (\`team_id\`, \`sport_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`venues\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(120) NOT NULL, \`address\` varchar(200) NULL, \`active\` tinyint NOT NULL DEFAULT 1, \`parent_id\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`tournament_venues\` (\`id\` int NOT NULL AUTO_INCREMENT, \`tournament_id\` int NOT NULL, \`venue_id\` int NOT NULL, UNIQUE INDEX \`UQ_tournament_venues_tournament_venue\` (\`tournament_id\`, \`venue_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`matches\` (\`id\` int NOT NULL AUTO_INCREMENT, \`scheduled_at\` datetime NOT NULL, \`status\` enum ('SCHEDULED', 'IN_PROGRESS', 'FINISHED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED', \`home_score\` int NULL, \`away_score\` int NULL, \`betting_open\` tinyint NOT NULL DEFAULT 1, \`phase_id\` int NOT NULL, \`venue_id\` int NULL, \`home_team_id\` int NOT NULL, \`away_team_id\` int NOT NULL, \`ball_id\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`group_teams\` (\`group_id\` int NOT NULL, \`team_id\` int NOT NULL, INDEX \`IDX_6e9057760268c61106d216deae\` (\`group_id\`), INDEX \`IDX_578cb7280cd7810fa10041d1ea\` (\`team_id\`), PRIMARY KEY (\`group_id\`, \`team_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`registrations\` ADD CONSTRAINT \`FK_6571f3ceaa2274ac20be44aea6d\` FOREIGN KEY (\`tournament_id\`) REFERENCES \`tournaments\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`registrations\` ADD CONSTRAINT \`FK_7b6436e8a7283fcb9d606ed4bb4\` FOREIGN KEY (\`team_id\`) REFERENCES \`teams\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`team_sports\` ADD CONSTRAINT \`FK_017e3e07d4b34d9994807bbe8be\` FOREIGN KEY (\`team_id\`) REFERENCES \`teams\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`team_sports\` ADD CONSTRAINT \`FK_58d0151a68fd3d72284a4165f3a\` FOREIGN KEY (\`sport_id\`) REFERENCES \`sports\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`venues\` ADD CONSTRAINT \`FK_3dbe1c25625358161a7edc52e15\` FOREIGN KEY (\`parent_id\`) REFERENCES \`venues\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`tournament_venues\` ADD CONSTRAINT \`FK_b5a4831bf3a9721f490690f7834\` FOREIGN KEY (\`tournament_id\`) REFERENCES \`tournaments\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`tournament_venues\` ADD CONSTRAINT \`FK_7156b8abe1720d8f50e49db8038\` FOREIGN KEY (\`venue_id\`) REFERENCES \`venues\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`matches\` ADD CONSTRAINT \`FK_4445c1b2bd39fe81088ea640acb\` FOREIGN KEY (\`phase_id\`) REFERENCES \`phases\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`matches\` ADD CONSTRAINT \`FK_cb90abceb14ab1b73e92823acce\` FOREIGN KEY (\`venue_id\`) REFERENCES \`venues\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`matches\` ADD CONSTRAINT \`FK_bb25f11ea6fa78b344a68923769\` FOREIGN KEY (\`home_team_id\`) REFERENCES \`teams\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`matches\` ADD CONSTRAINT \`FK_e457f057d971e464c1ebf6378c5\` FOREIGN KEY (\`away_team_id\`) REFERENCES \`teams\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`matches\` ADD CONSTRAINT \`FK_23ac68de6dd04907f0006566874\` FOREIGN KEY (\`ball_id\`) REFERENCES \`balls\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`group_teams\` ADD CONSTRAINT \`FK_6e9057760268c61106d216deae0\` FOREIGN KEY (\`group_id\`) REFERENCES \`phases\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE \`group_teams\` ADD CONSTRAINT \`FK_578cb7280cd7810fa10041d1ea8\` FOREIGN KEY (\`team_id\`) REFERENCES \`teams\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
        // Agregado a mano: el driver MySQL de TypeORM ignora @Check al generar migraciones.
        await queryRunner.query(`ALTER TABLE \`matches\` ADD CONSTRAINT \`CHK_matches_different_teams\` CHECK (\`home_team_id\` <> \`away_team_id\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`matches\` DROP CHECK \`CHK_matches_different_teams\``);
        await queryRunner.query(`ALTER TABLE \`group_teams\` DROP FOREIGN KEY \`FK_578cb7280cd7810fa10041d1ea8\``);
        await queryRunner.query(`ALTER TABLE \`group_teams\` DROP FOREIGN KEY \`FK_6e9057760268c61106d216deae0\``);
        await queryRunner.query(`ALTER TABLE \`matches\` DROP FOREIGN KEY \`FK_23ac68de6dd04907f0006566874\``);
        await queryRunner.query(`ALTER TABLE \`matches\` DROP FOREIGN KEY \`FK_e457f057d971e464c1ebf6378c5\``);
        await queryRunner.query(`ALTER TABLE \`matches\` DROP FOREIGN KEY \`FK_bb25f11ea6fa78b344a68923769\``);
        await queryRunner.query(`ALTER TABLE \`matches\` DROP FOREIGN KEY \`FK_cb90abceb14ab1b73e92823acce\``);
        await queryRunner.query(`ALTER TABLE \`matches\` DROP FOREIGN KEY \`FK_4445c1b2bd39fe81088ea640acb\``);
        await queryRunner.query(`ALTER TABLE \`tournament_venues\` DROP FOREIGN KEY \`FK_7156b8abe1720d8f50e49db8038\``);
        await queryRunner.query(`ALTER TABLE \`tournament_venues\` DROP FOREIGN KEY \`FK_b5a4831bf3a9721f490690f7834\``);
        await queryRunner.query(`ALTER TABLE \`venues\` DROP FOREIGN KEY \`FK_3dbe1c25625358161a7edc52e15\``);
        await queryRunner.query(`ALTER TABLE \`team_sports\` DROP FOREIGN KEY \`FK_58d0151a68fd3d72284a4165f3a\``);
        await queryRunner.query(`ALTER TABLE \`team_sports\` DROP FOREIGN KEY \`FK_017e3e07d4b34d9994807bbe8be\``);
        await queryRunner.query(`ALTER TABLE \`registrations\` DROP FOREIGN KEY \`FK_7b6436e8a7283fcb9d606ed4bb4\``);
        await queryRunner.query(`ALTER TABLE \`registrations\` DROP FOREIGN KEY \`FK_6571f3ceaa2274ac20be44aea6d\``);
        await queryRunner.query(`DROP INDEX \`IDX_578cb7280cd7810fa10041d1ea\` ON \`group_teams\``);
        await queryRunner.query(`DROP INDEX \`IDX_6e9057760268c61106d216deae\` ON \`group_teams\``);
        await queryRunner.query(`DROP TABLE \`group_teams\``);
        await queryRunner.query(`DROP TABLE \`matches\``);
        await queryRunner.query(`DROP INDEX \`UQ_tournament_venues_tournament_venue\` ON \`tournament_venues\``);
        await queryRunner.query(`DROP TABLE \`tournament_venues\``);
        await queryRunner.query(`DROP TABLE \`venues\``);
        await queryRunner.query(`DROP INDEX \`UQ_team_sports_team_sport\` ON \`team_sports\``);
        await queryRunner.query(`DROP TABLE \`team_sports\``);
        await queryRunner.query(`DROP INDEX \`UQ_teams_name_modality\` ON \`teams\``);
        await queryRunner.query(`DROP TABLE \`teams\``);
        await queryRunner.query(`DROP INDEX \`UQ_registrations_tournament_team\` ON \`registrations\``);
        await queryRunner.query(`DROP TABLE \`registrations\``);
    }

}
