import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentMethods1795243000000 implements MigrationInterface {
  name = 'AddPaymentMethods1795243000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`payment_methods\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(80) NOT NULL, \`type\` enum ('CARD', 'PSE', 'DIGITAL_WALLET', 'BANK_TRANSFER') NOT NULL, \`description\` varchar(250) NULL, \`active\` tinyint NOT NULL DEFAULT 1, UNIQUE INDEX \`UQ_payment_methods_name\` (\`name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`fan_payment_methods\` (\`id\` int NOT NULL AUTO_INCREMENT, \`alias\` varchar(80) NOT NULL, \`reference\` varchar(100) NOT NULL, \`details\` json NOT NULL, \`active\` tinyint NOT NULL DEFAULT 1, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`fan_id\` int NOT NULL, \`payment_method_id\` int NOT NULL, INDEX \`IDX_fan_payment_methods_fan\` (\`fan_id\`), INDEX \`IDX_fan_payment_methods_method\` (\`payment_method_id\`), UNIQUE INDEX \`UQ_fan_payment_methods_fan_method_ref\` (\`fan_id\`, \`payment_method_id\`, \`reference\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`fan_payment_methods\` ADD CONSTRAINT \`FK_fan_payment_methods_fan\` FOREIGN KEY (\`fan_id\`) REFERENCES \`fans\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`fan_payment_methods\` ADD CONSTRAINT \`FK_fan_payment_methods_payment_method\` FOREIGN KEY (\`payment_method_id\`) REFERENCES \`payment_methods\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`fan_payment_methods\` DROP FOREIGN KEY \`FK_fan_payment_methods_payment_method\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`fan_payment_methods\` DROP FOREIGN KEY \`FK_fan_payment_methods_fan\``,
    );
    await queryRunner.query(
      `DROP INDEX \`UQ_fan_payment_methods_fan_method_ref\` ON \`fan_payment_methods\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_fan_payment_methods_method\` ON \`fan_payment_methods\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_fan_payment_methods_fan\` ON \`fan_payment_methods\``,
    );
    await queryRunner.query(`DROP TABLE \`fan_payment_methods\``);
    await queryRunner.query(
      `DROP INDEX \`UQ_payment_methods_name\` ON \`payment_methods\``,
    );
    await queryRunner.query(`DROP TABLE \`payment_methods\``);
  }
}
