import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSeatsRelation1794413588564 implements MigrationInterface {
    name = 'AddSeatsRelation1794413588564'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`teams\` ADD \`group_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`matches\` DROP FOREIGN KEY \`FK_23ac68de6dd04907f0006566874\``);
        await queryRunner.query(`ALTER TABLE \`matches\` ADD UNIQUE INDEX \`IDX_23ac68de6dd04907f000656687\` (\`ball_id\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_23ac68de6dd04907f000656687\` ON \`matches\` (\`ball_id\`)`);
        await queryRunner.query(`ALTER TABLE \`teams\` ADD CONSTRAINT \`FK_dac3c13839536151455938e66b7\` FOREIGN KEY (\`group_id\`) REFERENCES \`phases\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`matches\` ADD CONSTRAINT \`FK_23ac68de6dd04907f0006566874\` FOREIGN KEY (\`ball_id\`) REFERENCES \`balls\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`matches\` DROP FOREIGN KEY \`FK_23ac68de6dd04907f0006566874\``);
        await queryRunner.query(`ALTER TABLE \`teams\` DROP FOREIGN KEY \`FK_dac3c13839536151455938e66b7\``);
        await queryRunner.query(`DROP INDEX \`REL_23ac68de6dd04907f000656687\` ON \`matches\``);
        await queryRunner.query(`ALTER TABLE \`matches\` DROP INDEX \`IDX_23ac68de6dd04907f000656687\``);
        await queryRunner.query(`ALTER TABLE \`matches\` ADD CONSTRAINT \`FK_23ac68de6dd04907f0006566874\` FOREIGN KEY (\`ball_id\`) REFERENCES \`balls\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`teams\` DROP COLUMN \`group_id\``);
    }

}
