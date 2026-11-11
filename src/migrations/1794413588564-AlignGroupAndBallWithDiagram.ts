import { MigrationInterface, QueryRunner } from "typeorm";

export class AlignGroupAndBallWithDiagram1794413588564 implements MigrationInterface {
    name = 'AlignGroupAndBallWithDiagram1794413588564'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`teams\` ADD \`group_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`matches\` DROP FOREIGN KEY \`FK_23ac68de6dd04907f0006566874\``);
        await queryRunner.query(`ALTER TABLE \`matches\` ADD UNIQUE INDEX \`IDX_23ac68de6dd04907f000656687\` (\`ball_id\`)`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`REL_23ac68de6dd04907f000656687\` ON \`matches\` (\`ball_id\`)`);
        await queryRunner.query(`ALTER TABLE \`teams\` ADD CONSTRAINT \`FK_dac3c13839536151455938e66b7\` FOREIGN KEY (\`group_id\`) REFERENCES \`phases\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`matches\` ADD CONSTRAINT \`FK_23ac68de6dd04907f0006566874\` FOREIGN KEY (\`ball_id\`) REFERENCES \`balls\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // Grupo 1 — n Equipo: la tabla de unión del @ManyToMany anterior ya no se usa.
        // TypeORM no borra tablas sin entidad, por eso se elimina a mano.
        await queryRunner.query(`ALTER TABLE \`group_teams\` DROP FOREIGN KEY \`FK_578cb7280cd7810fa10041d1ea8\``);
        await queryRunner.query(`ALTER TABLE \`group_teams\` DROP FOREIGN KEY \`FK_6e9057760268c61106d216deae0\``);
        await queryRunner.query(`DROP TABLE \`group_teams\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`group_teams\` (\`group_id\` int NOT NULL, \`team_id\` int NOT NULL, INDEX \`IDX_6e9057760268c61106d216deae\` (\`group_id\`), INDEX \`IDX_578cb7280cd7810fa10041d1ea\` (\`team_id\`), PRIMARY KEY (\`group_id\`, \`team_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`group_teams\` ADD CONSTRAINT \`FK_6e9057760268c61106d216deae0\` FOREIGN KEY (\`group_id\`) REFERENCES \`phases\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE \`group_teams\` ADD CONSTRAINT \`FK_578cb7280cd7810fa10041d1ea8\` FOREIGN KEY (\`team_id\`) REFERENCES \`teams\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE \`matches\` DROP FOREIGN KEY \`FK_23ac68de6dd04907f0006566874\``);
        await queryRunner.query(`ALTER TABLE \`teams\` DROP FOREIGN KEY \`FK_dac3c13839536151455938e66b7\``);
        await queryRunner.query(`DROP INDEX \`REL_23ac68de6dd04907f000656687\` ON \`matches\``);
        await queryRunner.query(`ALTER TABLE \`matches\` DROP INDEX \`IDX_23ac68de6dd04907f000656687\``);
        await queryRunner.query(`ALTER TABLE \`matches\` ADD CONSTRAINT \`FK_23ac68de6dd04907f0006566874\` FOREIGN KEY (\`ball_id\`) REFERENCES \`balls\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`teams\` DROP COLUMN \`group_id\``);
    }

}
