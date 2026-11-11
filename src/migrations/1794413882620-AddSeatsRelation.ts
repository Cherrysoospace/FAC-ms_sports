import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSeatsRelation1794413882620 implements MigrationInterface {
    name = 'AddSeatsRelation1794413882620'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`registrations\` (\`id\` int NOT NULL AUTO_INCREMENT, \`registered_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`status\` enum ('ACTIVE', 'WITHDRAWN') NOT NULL DEFAULT 'ACTIVE', \`withdrawn_at\` datetime NULL, \`tournament_id\` int NOT NULL, \`team_id\` int NOT NULL, UNIQUE INDEX \`UQ_registrations_tournament_team\` (\`tournament_id\`, \`team_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`teams\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(120) NOT NULL, \`city\` varchar(80) NOT NULL, \`modality\` enum ('MALE', 'FEMALE', 'MIXED') NOT NULL, \`active\` tinyint NOT NULL DEFAULT 1, \`group_id\` int NULL, UNIQUE INDEX \`UQ_teams_name_modality\` (\`name\`, \`modality\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`team_sports\` (\`id\` int NOT NULL AUTO_INCREMENT, \`team_id\` int NOT NULL, \`sport_id\` int NOT NULL, UNIQUE INDEX \`UQ_team_sports_team_sport\` (\`team_id\`, \`sport_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`sports\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(100) NOT NULL, \`description\` varchar(255) NULL, \`active\` tinyint NOT NULL DEFAULT 1, \`parent_id\` int NULL, UNIQUE INDEX \`IDX_838312bddf12c427e3f66657ff\` (\`name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`venues\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(120) NOT NULL, \`address\` varchar(200) NULL, \`active\` tinyint NOT NULL DEFAULT 1, \`parent_id\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`tournament_venues\` (\`id\` int NOT NULL AUTO_INCREMENT, \`tournament_id\` int NOT NULL, \`venue_id\` int NOT NULL, UNIQUE INDEX \`UQ_tournament_venues_tournament_venue\` (\`tournament_id\`, \`venue_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`tournaments\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(150) NOT NULL, \`start_date\` date NOT NULL, \`end_date\` date NOT NULL, \`registration_opens_at\` datetime NOT NULL, \`registration_closes_at\` datetime NOT NULL, \`status\` enum ('PLANNED', 'REGISTRATION_OPEN', 'IN_PROGRESS', 'FINISHED', 'CANCELLED') NOT NULL DEFAULT 'PLANNED', \`active\` tinyint NOT NULL DEFAULT 1, \`sport_id\` int NOT NULL, UNIQUE INDEX \`UQ_tournaments_name_sport\` (\`name\`, \`sport_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`phases\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(100) NOT NULL, \`phase_order\` int NOT NULL, \`start_date\` date NULL, \`end_date\` date NULL, \`round\` enum ('ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'THIRD_PLACE', 'FINAL') NULL, \`group_name\` varchar(10) NULL, \`qualifiers_count\` int NULL, \`type\` varchar(20) NOT NULL, \`tournament_id\` int NOT NULL, UNIQUE INDEX \`UQ_phases_tournament_round\` (\`tournament_id\`, \`round\`), UNIQUE INDEX \`UQ_phases_tournament_order_group\` (\`tournament_id\`, \`phase_order\`, \`group_name\`), INDEX \`IDX_4340f5685fe1f84cecf842c69f\` (\`type\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`matches\` (\`id\` int NOT NULL AUTO_INCREMENT, \`scheduled_at\` datetime NOT NULL, \`status\` enum ('SCHEDULED', 'IN_PROGRESS', 'FINISHED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED', \`home_score\` int NULL, \`away_score\` int NULL, \`betting_open\` tinyint NOT NULL DEFAULT 1, \`phase_id\` int NOT NULL, \`venue_id\` int NULL, \`home_team_id\` int NOT NULL, \`away_team_id\` int NOT NULL, \`ball_id\` int NULL, UNIQUE INDEX \`REL_23ac68de6dd04907f000656687\` (\`ball_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`balls\` (\`id\` int NOT NULL AUTO_INCREMENT, \`brand\` varchar(80) NOT NULL, \`model\` varchar(80) NOT NULL, \`size\` varchar(20) NULL, \`active\` tinyint NOT NULL DEFAULT 1, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`registrations\` ADD CONSTRAINT \`FK_6571f3ceaa2274ac20be44aea6d\` FOREIGN KEY (\`tournament_id\`) REFERENCES \`tournaments\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`registrations\` ADD CONSTRAINT \`FK_7b6436e8a7283fcb9d606ed4bb4\` FOREIGN KEY (\`team_id\`) REFERENCES \`teams\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`teams\` ADD CONSTRAINT \`FK_dac3c13839536151455938e66b7\` FOREIGN KEY (\`group_id\`) REFERENCES \`phases\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`team_sports\` ADD CONSTRAINT \`FK_017e3e07d4b34d9994807bbe8be\` FOREIGN KEY (\`team_id\`) REFERENCES \`teams\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`team_sports\` ADD CONSTRAINT \`FK_58d0151a68fd3d72284a4165f3a\` FOREIGN KEY (\`sport_id\`) REFERENCES \`sports\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`sports\` ADD CONSTRAINT \`FK_5bc9d25aca265351a40abe7a82b\` FOREIGN KEY (\`parent_id\`) REFERENCES \`sports\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`venues\` ADD CONSTRAINT \`FK_3dbe1c25625358161a7edc52e15\` FOREIGN KEY (\`parent_id\`) REFERENCES \`venues\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`tournament_venues\` ADD CONSTRAINT \`FK_b5a4831bf3a9721f490690f7834\` FOREIGN KEY (\`tournament_id\`) REFERENCES \`tournaments\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`tournament_venues\` ADD CONSTRAINT \`FK_7156b8abe1720d8f50e49db8038\` FOREIGN KEY (\`venue_id\`) REFERENCES \`venues\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`tournaments\` ADD CONSTRAINT \`FK_186453945127b1b37ff7c22984d\` FOREIGN KEY (\`sport_id\`) REFERENCES \`sports\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`phases\` ADD CONSTRAINT \`FK_38239acd04502fb5f883d2956a2\` FOREIGN KEY (\`tournament_id\`) REFERENCES \`tournaments\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`matches\` ADD CONSTRAINT \`FK_4445c1b2bd39fe81088ea640acb\` FOREIGN KEY (\`phase_id\`) REFERENCES \`phases\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`matches\` ADD CONSTRAINT \`FK_cb90abceb14ab1b73e92823acce\` FOREIGN KEY (\`venue_id\`) REFERENCES \`venues\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`matches\` ADD CONSTRAINT \`FK_bb25f11ea6fa78b344a68923769\` FOREIGN KEY (\`home_team_id\`) REFERENCES \`teams\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`matches\` ADD CONSTRAINT \`FK_e457f057d971e464c1ebf6378c5\` FOREIGN KEY (\`away_team_id\`) REFERENCES \`teams\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`matches\` ADD CONSTRAINT \`FK_23ac68de6dd04907f0006566874\` FOREIGN KEY (\`ball_id\`) REFERENCES \`balls\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`matches\` DROP FOREIGN KEY \`FK_23ac68de6dd04907f0006566874\``);
        await queryRunner.query(`ALTER TABLE \`matches\` DROP FOREIGN KEY \`FK_e457f057d971e464c1ebf6378c5\``);
        await queryRunner.query(`ALTER TABLE \`matches\` DROP FOREIGN KEY \`FK_bb25f11ea6fa78b344a68923769\``);
        await queryRunner.query(`ALTER TABLE \`matches\` DROP FOREIGN KEY \`FK_cb90abceb14ab1b73e92823acce\``);
        await queryRunner.query(`ALTER TABLE \`matches\` DROP FOREIGN KEY \`FK_4445c1b2bd39fe81088ea640acb\``);
        await queryRunner.query(`ALTER TABLE \`phases\` DROP FOREIGN KEY \`FK_38239acd04502fb5f883d2956a2\``);
        await queryRunner.query(`ALTER TABLE \`tournaments\` DROP FOREIGN KEY \`FK_186453945127b1b37ff7c22984d\``);
        await queryRunner.query(`ALTER TABLE \`tournament_venues\` DROP FOREIGN KEY \`FK_7156b8abe1720d8f50e49db8038\``);
        await queryRunner.query(`ALTER TABLE \`tournament_venues\` DROP FOREIGN KEY \`FK_b5a4831bf3a9721f490690f7834\``);
        await queryRunner.query(`ALTER TABLE \`venues\` DROP FOREIGN KEY \`FK_3dbe1c25625358161a7edc52e15\``);
        await queryRunner.query(`ALTER TABLE \`sports\` DROP FOREIGN KEY \`FK_5bc9d25aca265351a40abe7a82b\``);
        await queryRunner.query(`ALTER TABLE \`team_sports\` DROP FOREIGN KEY \`FK_58d0151a68fd3d72284a4165f3a\``);
        await queryRunner.query(`ALTER TABLE \`team_sports\` DROP FOREIGN KEY \`FK_017e3e07d4b34d9994807bbe8be\``);
        await queryRunner.query(`ALTER TABLE \`teams\` DROP FOREIGN KEY \`FK_dac3c13839536151455938e66b7\``);
        await queryRunner.query(`ALTER TABLE \`registrations\` DROP FOREIGN KEY \`FK_7b6436e8a7283fcb9d606ed4bb4\``);
        await queryRunner.query(`ALTER TABLE \`registrations\` DROP FOREIGN KEY \`FK_6571f3ceaa2274ac20be44aea6d\``);
        await queryRunner.query(`DROP TABLE \`balls\``);
        await queryRunner.query(`DROP INDEX \`REL_23ac68de6dd04907f000656687\` ON \`matches\``);
        await queryRunner.query(`DROP TABLE \`matches\``);
        await queryRunner.query(`DROP INDEX \`IDX_4340f5685fe1f84cecf842c69f\` ON \`phases\``);
        await queryRunner.query(`DROP INDEX \`UQ_phases_tournament_order_group\` ON \`phases\``);
        await queryRunner.query(`DROP INDEX \`UQ_phases_tournament_round\` ON \`phases\``);
        await queryRunner.query(`DROP TABLE \`phases\``);
        await queryRunner.query(`DROP INDEX \`UQ_tournaments_name_sport\` ON \`tournaments\``);
        await queryRunner.query(`DROP TABLE \`tournaments\``);
        await queryRunner.query(`DROP INDEX \`UQ_tournament_venues_tournament_venue\` ON \`tournament_venues\``);
        await queryRunner.query(`DROP TABLE \`tournament_venues\``);
        await queryRunner.query(`DROP TABLE \`venues\``);
        await queryRunner.query(`DROP INDEX \`IDX_838312bddf12c427e3f66657ff\` ON \`sports\``);
        await queryRunner.query(`DROP TABLE \`sports\``);
        await queryRunner.query(`DROP INDEX \`UQ_team_sports_team_sport\` ON \`team_sports\``);
        await queryRunner.query(`DROP TABLE \`team_sports\``);
        await queryRunner.query(`DROP INDEX \`UQ_teams_name_modality\` ON \`teams\``);
        await queryRunner.query(`DROP TABLE \`teams\``);
        await queryRunner.query(`DROP INDEX \`UQ_registrations_tournament_team\` ON \`registrations\``);
        await queryRunner.query(`DROP TABLE \`registrations\``);
    }

}
