import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTickets1795244000000 implements MigrationInterface {
  name = 'AddTickets1795244000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`tickets\` (\`id\` int NOT NULL AUTO_INCREMENT, \`code\` varchar(40) NOT NULL, \`price\` decimal(10,2) NOT NULL DEFAULT '0.00', \`purchased_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`match_id\` int NOT NULL, \`fan_id\` int NOT NULL, \`location_id\` int NOT NULL, INDEX \`IDX_tickets_match_location\` (\`match_id\`, \`location_id\`), INDEX \`IDX_tickets_location_match\` (\`location_id\`, \`match_id\`), INDEX \`IDX_tickets_fan\` (\`fan_id\`), UNIQUE INDEX \`UQ_tickets_code\` (\`code\`), UNIQUE INDEX \`UQ_tickets_match_fan\` (\`match_id\`, \`fan_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`tickets\` ADD CONSTRAINT \`FK_tickets_match\` FOREIGN KEY (\`match_id\`) REFERENCES \`matches\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`tickets\` ADD CONSTRAINT \`FK_tickets_fan\` FOREIGN KEY (\`fan_id\`) REFERENCES \`fans\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`tickets\` ADD CONSTRAINT \`FK_tickets_location\` FOREIGN KEY (\`location_id\`) REFERENCES \`locations\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`tickets\` ADD CONSTRAINT \`CHK_tickets_price_non_negative\` CHECK (\`price\` >= 0)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`tickets\` DROP CHECK \`CHK_tickets_price_non_negative\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`tickets\` DROP FOREIGN KEY \`FK_tickets_location\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`tickets\` DROP FOREIGN KEY \`FK_tickets_fan\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`tickets\` DROP FOREIGN KEY \`FK_tickets_match\``,
    );
    await queryRunner.query(
      `DROP INDEX \`UQ_tickets_match_fan\` ON \`tickets\``,
    );
    await queryRunner.query(`DROP INDEX \`UQ_tickets_code\` ON \`tickets\``);
    await queryRunner.query(`DROP INDEX \`IDX_tickets_fan\` ON \`tickets\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_tickets_location_match\` ON \`tickets\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_tickets_match_location\` ON \`tickets\``,
    );
    await queryRunner.query(`DROP TABLE \`tickets\``);
  }
}

