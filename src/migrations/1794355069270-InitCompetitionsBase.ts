import { MigrationInterface, QueryRunner } from "typeorm";

export class InitCompetitionsBase1794355069270 implements MigrationInterface {
    name = 'InitCompetitionsBase1794355069270'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`balls\` (\`id\` int NOT NULL AUTO_INCREMENT, \`brand\` varchar(80) NOT NULL, \`model\` varchar(80) NOT NULL, \`size\` varchar(20) NULL, \`active\` tinyint NOT NULL DEFAULT 1, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`sports\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(100) NOT NULL, \`description\` varchar(255) NULL, \`active\` tinyint NOT NULL DEFAULT 1, \`parent_id\` int NULL, UNIQUE INDEX \`IDX_838312bddf12c427e3f66657ff\` (\`name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`tournaments\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(150) NOT NULL, \`start_date\` date NOT NULL, \`end_date\` date NOT NULL, \`registration_opens_at\` datetime NOT NULL, \`registration_closes_at\` datetime NOT NULL, \`status\` enum ('PLANNED', 'REGISTRATION_OPEN', 'IN_PROGRESS', 'FINISHED', 'CANCELLED') NOT NULL DEFAULT 'PLANNED', \`active\` tinyint NOT NULL DEFAULT 1, \`sport_id\` int NOT NULL, UNIQUE INDEX \`UQ_tournaments_name_sport\` (\`name\`, \`sport_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`phases\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(100) NOT NULL, \`phase_order\` int NOT NULL, \`start_date\` date NULL, \`end_date\` date NULL, \`round\` enum ('ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'THIRD_PLACE', 'FINAL') NULL, \`group_name\` varchar(10) NULL, \`qualifiers_count\` int NULL, \`type\` varchar(20) NOT NULL, \`tournament_id\` int NOT NULL, UNIQUE INDEX \`UQ_phases_tournament_round\` (\`tournament_id\`, \`round\`), UNIQUE INDEX \`UQ_phases_tournament_order_group\` (\`tournament_id\`, \`phase_order\`, \`group_name\`), INDEX \`IDX_4340f5685fe1f84cecf842c69f\` (\`type\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`sports\` ADD CONSTRAINT \`FK_5bc9d25aca265351a40abe7a82b\` FOREIGN KEY (\`parent_id\`) REFERENCES \`sports\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`tournaments\` ADD CONSTRAINT \`FK_186453945127b1b37ff7c22984d\` FOREIGN KEY (\`sport_id\`) REFERENCES \`sports\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`phases\` ADD CONSTRAINT \`FK_38239acd04502fb5f883d2956a2\` FOREIGN KEY (\`tournament_id\`) REFERENCES \`tournaments\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`phases\` DROP FOREIGN KEY \`FK_38239acd04502fb5f883d2956a2\``);
        await queryRunner.query(`ALTER TABLE \`tournaments\` DROP FOREIGN KEY \`FK_186453945127b1b37ff7c22984d\``);
        await queryRunner.query(`ALTER TABLE \`sports\` DROP FOREIGN KEY \`FK_5bc9d25aca265351a40abe7a82b\``);
        await queryRunner.query(`DROP INDEX \`IDX_4340f5685fe1f84cecf842c69f\` ON \`phases\``);
        await queryRunner.query(`DROP INDEX \`UQ_phases_tournament_order_group\` ON \`phases\``);
        await queryRunner.query(`DROP INDEX \`UQ_phases_tournament_round\` ON \`phases\``);
        await queryRunner.query(`DROP TABLE \`phases\``);
        await queryRunner.query(`DROP INDEX \`UQ_tournaments_name_sport\` ON \`tournaments\``);
        await queryRunner.query(`DROP TABLE \`tournaments\``);
        await queryRunner.query(`DROP INDEX \`IDX_838312bddf12c427e3f66657ff\` ON \`sports\``);
        await queryRunner.query(`DROP TABLE \`sports\``);
        await queryRunner.query(`DROP TABLE \`balls\``);
    }

}
