import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeMatchVenueAndBallRequired1794670869884 implements MigrationInterface {
    name = 'MakeMatchVenueAndBallRequired1794670869884'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`matches\` DROP FOREIGN KEY \`FK_cb90abceb14ab1b73e92823acce\``);
        await queryRunner.query(`ALTER TABLE \`matches\` DROP FOREIGN KEY \`FK_23ac68de6dd04907f0006566874\``);
        await queryRunner.query(`ALTER TABLE \`matches\` CHANGE \`venue_id\` \`venue_id\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`matches\` CHANGE \`ball_id\` \`ball_id\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`matches\` ADD CONSTRAINT \`FK_cb90abceb14ab1b73e92823acce\` FOREIGN KEY (\`venue_id\`) REFERENCES \`venues\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`matches\` ADD CONSTRAINT \`FK_23ac68de6dd04907f0006566874\` FOREIGN KEY (\`ball_id\`) REFERENCES \`balls\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`matches\` DROP FOREIGN KEY \`FK_23ac68de6dd04907f0006566874\``);
        await queryRunner.query(`ALTER TABLE \`matches\` DROP FOREIGN KEY \`FK_cb90abceb14ab1b73e92823acce\``);
        await queryRunner.query(`ALTER TABLE \`matches\` CHANGE \`ball_id\` \`ball_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`matches\` CHANGE \`venue_id\` \`venue_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`matches\` ADD CONSTRAINT \`FK_23ac68de6dd04907f0006566874\` FOREIGN KEY (\`ball_id\`) REFERENCES \`balls\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`matches\` ADD CONSTRAINT \`FK_cb90abceb14ab1b73e92823acce\` FOREIGN KEY (\`venue_id\`) REFERENCES \`venues\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
