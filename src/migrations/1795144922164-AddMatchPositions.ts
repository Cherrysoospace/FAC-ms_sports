import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMatchPositions1795144922164 implements MigrationInterface {
    name = 'AddMatchPositions1795144922164'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`match_positions\` (\`id\` int NOT NULL AUTO_INCREMENT, \`x\` decimal(5,2) NOT NULL, \`y\` decimal(5,2) NOT NULL, \`recorded_at\` datetime(3) NOT NULL, \`match_id\` int NOT NULL, \`player_id\` int NULL, \`ball_id\` int NULL, INDEX \`IDX_match_positions_match_recorded\` (\`match_id\`, \`recorded_at\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`match_positions\` ADD CONSTRAINT \`FK_9364fa3ecc27a61bb7cff227e48\` FOREIGN KEY (\`match_id\`) REFERENCES \`matches\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`match_positions\` ADD CONSTRAINT \`FK_2b261e9621e571710dfeee7153c\` FOREIGN KEY (\`player_id\`) REFERENCES \`players\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`match_positions\` ADD CONSTRAINT \`FK_9fbc9eeeec56aa72505de4450cf\` FOREIGN KEY (\`ball_id\`) REFERENCES \`balls\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        // TypeORM no genera CHECK en MySQL: cada fila es de un jugador o de la pelota, nunca ambos ni ninguno.
        await queryRunner.query(`ALTER TABLE \`match_positions\` ADD CONSTRAINT \`CHK_match_positions_player_or_ball\` CHECK ((\`player_id\` IS NULL) <> (\`ball_id\` IS NULL))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`match_positions\` DROP CHECK \`CHK_match_positions_player_or_ball\``);
        await queryRunner.query(`ALTER TABLE \`match_positions\` DROP FOREIGN KEY \`FK_9fbc9eeeec56aa72505de4450cf\``);
        await queryRunner.query(`ALTER TABLE \`match_positions\` DROP FOREIGN KEY \`FK_2b261e9621e571710dfeee7153c\``);
        await queryRunner.query(`ALTER TABLE \`match_positions\` DROP FOREIGN KEY \`FK_9364fa3ecc27a61bb7cff227e48\``);
        await queryRunner.query(`DROP INDEX \`IDX_match_positions_match_recorded\` ON \`match_positions\``);
        await queryRunner.query(`DROP TABLE \`match_positions\``);
    }

}
