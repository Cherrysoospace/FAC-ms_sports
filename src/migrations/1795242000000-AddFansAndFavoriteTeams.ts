import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFansAndFavoriteTeams1795242000000 implements MigrationInterface {
  name = 'AddFansAndFavoriteTeams1795242000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`fans\` (\`id\` int NOT NULL AUTO_INCREMENT, \`security_user_id\` int NOT NULL, \`full_name\` varchar(120) NOT NULL, \`document_number\` varchar(20) NOT NULL, \`email\` varchar(150) NOT NULL, \`phone\` varchar(30) NULL, \`active\` tinyint NOT NULL DEFAULT 1, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`UQ_fans_security_user_id\` (\`security_user_id\`), UNIQUE INDEX \`UQ_fans_document_number\` (\`document_number\`), UNIQUE INDEX \`UQ_fans_email\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`fan_teams\` (\`id\` int NOT NULL AUTO_INCREMENT, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`fan_id\` int NOT NULL, \`team_id\` int NOT NULL, INDEX \`IDX_fan_teams_team\` (\`team_id\`), UNIQUE INDEX \`UQ_fan_teams_fan_team\` (\`fan_id\`, \`team_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`fan_teams\` ADD CONSTRAINT \`FK_fan_teams_fan\` FOREIGN KEY (\`fan_id\`) REFERENCES \`fans\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`fan_teams\` ADD CONSTRAINT \`FK_fan_teams_team\` FOREIGN KEY (\`team_id\`) REFERENCES \`teams\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`fan_teams\` DROP FOREIGN KEY \`FK_fan_teams_team\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`fan_teams\` DROP FOREIGN KEY \`FK_fan_teams_fan\``,
    );
    await queryRunner.query(
      `DROP INDEX \`UQ_fan_teams_fan_team\` ON \`fan_teams\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_fan_teams_team\` ON \`fan_teams\``,
    );
    await queryRunner.query(`DROP TABLE \`fan_teams\``);
    await queryRunner.query(`DROP INDEX \`UQ_fans_email\` ON \`fans\``);
    await queryRunner.query(
      `DROP INDEX \`UQ_fans_document_number\` ON \`fans\``,
    );
    await queryRunner.query(
      `DROP INDEX \`UQ_fans_security_user_id\` ON \`fans\``,
    );
    await queryRunner.query(`DROP TABLE \`fans\``);
  }
}
