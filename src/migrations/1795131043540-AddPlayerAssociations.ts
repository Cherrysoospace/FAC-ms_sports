import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPlayerAssociations1795131043540 implements MigrationInterface {
    name = 'AddPlayerAssociations1795131043540'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`player_skills\` (\`id\` int NOT NULL AUTO_INCREMENT, \`level\` tinyint UNSIGNED NOT NULL, \`player_id\` int NOT NULL, \`skill_id\` int NOT NULL, UNIQUE INDEX \`UQ_player_skills_player_skill\` (\`player_id\`, \`skill_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`team_players\` (\`id\` int NOT NULL AUTO_INCREMENT, \`start_date\` date NOT NULL, \`end_date\` date NOT NULL, \`status\` enum ('ACTIVE', 'RELEASED') NOT NULL DEFAULT 'ACTIVE', \`release_date\` date NULL, \`release_reason\` enum ('TRANSFERRED', 'CONTRACT_ENDED', 'TERMINATED') NULL, \`team_id\` int NOT NULL, \`player_id\` int NOT NULL, INDEX \`IDX_team_players_team_player\` (\`team_id\`, \`player_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`team_relations\` (\`team_id\` int NOT NULL, \`related_team_id\` int NOT NULL, INDEX \`IDX_2d5febdd09f67c148e1d5cfa12\` (\`team_id\`), INDEX \`IDX_4d71e689b747893f4060ffa88c\` (\`related_team_id\`), PRIMARY KEY (\`team_id\`, \`related_team_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`player_skills\` ADD CONSTRAINT \`FK_1ec09bc2eca330ad10927d3ea37\` FOREIGN KEY (\`player_id\`) REFERENCES \`players\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`player_skills\` ADD CONSTRAINT \`FK_2646438b8d39b999ce786003e6d\` FOREIGN KEY (\`skill_id\`) REFERENCES \`skills\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`team_players\` ADD CONSTRAINT \`FK_d1c561e231a8067e2f7a403426c\` FOREIGN KEY (\`team_id\`) REFERENCES \`teams\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`team_players\` ADD CONSTRAINT \`FK_187fdfeb2ca268cf6b93e89ce12\` FOREIGN KEY (\`player_id\`) REFERENCES \`players\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`team_relations\` ADD CONSTRAINT \`FK_2d5febdd09f67c148e1d5cfa120\` FOREIGN KEY (\`team_id\`) REFERENCES \`teams\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`team_relations\` ADD CONSTRAINT \`FK_4d71e689b747893f4060ffa88c6\` FOREIGN KEY (\`related_team_id\`) REFERENCES \`teams\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`team_relations\` DROP FOREIGN KEY \`FK_4d71e689b747893f4060ffa88c6\``);
        await queryRunner.query(`ALTER TABLE \`team_relations\` DROP FOREIGN KEY \`FK_2d5febdd09f67c148e1d5cfa120\``);
        await queryRunner.query(`ALTER TABLE \`team_players\` DROP FOREIGN KEY \`FK_187fdfeb2ca268cf6b93e89ce12\``);
        await queryRunner.query(`ALTER TABLE \`team_players\` DROP FOREIGN KEY \`FK_d1c561e231a8067e2f7a403426c\``);
        await queryRunner.query(`ALTER TABLE \`player_skills\` DROP FOREIGN KEY \`FK_2646438b8d39b999ce786003e6d\``);
        await queryRunner.query(`ALTER TABLE \`player_skills\` DROP FOREIGN KEY \`FK_1ec09bc2eca330ad10927d3ea37\``);
        await queryRunner.query(`DROP INDEX \`IDX_4d71e689b747893f4060ffa88c\` ON \`team_relations\``);
        await queryRunner.query(`DROP INDEX \`IDX_2d5febdd09f67c148e1d5cfa12\` ON \`team_relations\``);
        await queryRunner.query(`DROP TABLE \`team_relations\``);
        await queryRunner.query(`DROP INDEX \`IDX_team_players_team_player\` ON \`team_players\``);
        await queryRunner.query(`DROP TABLE \`team_players\``);
        await queryRunner.query(`DROP INDEX \`UQ_player_skills_player_skill\` ON \`player_skills\``);
        await queryRunner.query(`DROP TABLE \`player_skills\``);
    }

}
