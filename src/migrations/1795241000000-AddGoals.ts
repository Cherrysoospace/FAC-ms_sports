import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGoals1795241000000 implements MigrationInterface {
  name = 'AddGoals1795241000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`goals\` (\`id\` int NOT NULL AUTO_INCREMENT, \`minute\` smallint NOT NULL, \`points\` smallint NOT NULL DEFAULT 1, \`description\` varchar(200) NULL, \`recorded_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`match_id\` int NOT NULL, \`player_id\` int NOT NULL, INDEX \`IDX_goals_match_minute\` (\`match_id\`, \`minute\`), INDEX \`IDX_goals_player\` (\`player_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`goals\` ADD CONSTRAINT \`FK_goals_match\` FOREIGN KEY (\`match_id\`) REFERENCES \`matches\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`goals\` ADD CONSTRAINT \`FK_goals_player\` FOREIGN KEY (\`player_id\`) REFERENCES \`players\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`goals\` ADD CONSTRAINT \`CHK_goals_minute_non_negative\` CHECK (\`minute\` >= 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`goals\` ADD CONSTRAINT \`CHK_goals_points_positive\` CHECK (\`points\` >= 1)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`goals\` DROP CHECK \`CHK_goals_points_positive\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`goals\` DROP CHECK \`CHK_goals_minute_non_negative\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`goals\` DROP FOREIGN KEY \`FK_goals_player\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`goals\` DROP FOREIGN KEY \`FK_goals_match\``,
    );
    await queryRunner.query(`DROP INDEX \`IDX_goals_player\` ON \`goals\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_goals_match_minute\` ON \`goals\``,
    );
    await queryRunner.query(`DROP TABLE \`goals\``);
  }
}
