import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLocations1794665256988 implements MigrationInterface {
    name = 'AddLocations1794665256988'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Índice único duplicado sobre matches.ball_id que dejó AlignGroupAndBallWithDiagram:
        // el @OneToOne ya tiene REL_23ac68de6dd04907f000656687, que mantiene la unicidad.
        await queryRunner.query(`DROP INDEX \`IDX_23ac68de6dd04907f000656687\` ON \`matches\``);
        await queryRunner.query(`CREATE TABLE \`locations\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(60) NOT NULL, \`capacity\` int NOT NULL, \`active\` tinyint NOT NULL DEFAULT 1, \`venue_id\` int NOT NULL, UNIQUE INDEX \`UQ_locations_venue_name\` (\`venue_id\`, \`name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`locations\` ADD CONSTRAINT \`FK_5f63c3e2b5a7af86cd2743f7346\` FOREIGN KEY (\`venue_id\`) REFERENCES \`venues\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`locations\` DROP FOREIGN KEY \`FK_5f63c3e2b5a7af86cd2743f7346\``);
        await queryRunner.query(`DROP INDEX \`UQ_locations_venue_name\` ON \`locations\``);
        await queryRunner.query(`DROP TABLE \`locations\``);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_23ac68de6dd04907f000656687\` ON \`matches\` (\`ball_id\`)`);
    }

}
