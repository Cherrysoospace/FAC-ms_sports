import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPlayersAndSkills1795127461310 implements MigrationInterface {
    name = 'AddPlayersAndSkills1795127461310'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`players\` (\`id\` int NOT NULL AUTO_INCREMENT, \`full_name\` varchar(120) NOT NULL, \`document_number\` varchar(20) NOT NULL, \`birth_date\` date NOT NULL, \`nationality\` varchar(60) NOT NULL, \`position\` varchar(40) NOT NULL, \`height_cm\` smallint NOT NULL, \`dominant_foot\` enum ('RIGHT', 'LEFT', 'BOTH') NULL, \`active\` tinyint NOT NULL DEFAULT 1, UNIQUE INDEX \`UQ_players_document_number\` (\`document_number\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`skills\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(80) NOT NULL, \`category\` enum ('PHYSICAL', 'TECHNICAL', 'TACTICAL', 'MENTAL') NOT NULL, \`description\` varchar(500) NOT NULL, UNIQUE INDEX \`UQ_skills_name\` (\`name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`UQ_skills_name\` ON \`skills\``);
        await queryRunner.query(`DROP TABLE \`skills\``);
        await queryRunner.query(`DROP INDEX \`UQ_players_document_number\` ON \`players\``);
        await queryRunner.query(`DROP TABLE \`players\``);
    }

}
