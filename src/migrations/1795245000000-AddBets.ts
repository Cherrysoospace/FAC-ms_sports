import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBets1795245000000 implements MigrationInterface {
  name = 'AddBets1795245000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`bets\` (\`id\` int NOT NULL AUTO_INCREMENT, \`selection\` enum('HOME_WIN','DRAW','AWAY_WIN') NOT NULL, \`amount\` decimal(12,2) NOT NULL, \`odds\` decimal(6,2) NOT NULL, \`status\` enum('PENDING','WON','LOST','VOID','CANCELLED') NOT NULL DEFAULT 'PENDING', \`payout\` decimal(14,2) NULL, \`placed_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`settled_at\` datetime NULL, \`settlement_note\` varchar(255) NULL, \`match_id\` int NOT NULL, \`fan_id\` int NOT NULL, \`fan_payment_method_id\` int NOT NULL, INDEX \`IDX_bets_match_status\` (\`match_id\`, \`status\`), INDEX \`IDX_bets_fan_status\` (\`fan_id\`, \`status\`), INDEX \`IDX_bets_fan_payment_method\` (\`fan_payment_method_id\`), UNIQUE INDEX \`UQ_bets_match_fan\` (\`match_id\`, \`fan_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`bets\` ADD CONSTRAINT \`FK_bets_match\` FOREIGN KEY (\`match_id\`) REFERENCES \`matches\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`bets\` ADD CONSTRAINT \`FK_bets_fan\` FOREIGN KEY (\`fan_id\`) REFERENCES \`fans\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`bets\` ADD CONSTRAINT \`FK_bets_fan_payment_method\` FOREIGN KEY (\`fan_payment_method_id\`) REFERENCES \`fan_payment_methods\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`bets\` ADD CONSTRAINT \`CHK_bets_amount_positive\` CHECK (\`amount\` > 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`bets\` ADD CONSTRAINT \`CHK_bets_odds_gt_one\` CHECK (\`odds\` > 1)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`bets\` ADD CONSTRAINT \`CHK_bets_payout_non_negative\` CHECK (\`payout\` IS NULL OR \`payout\` >= 0)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`bets\` DROP CHECK \`CHK_bets_payout_non_negative\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`bets\` DROP CHECK \`CHK_bets_odds_gt_one\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`bets\` DROP CHECK \`CHK_bets_amount_positive\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`bets\` DROP FOREIGN KEY \`FK_bets_fan_payment_method\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`bets\` DROP FOREIGN KEY \`FK_bets_fan\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`bets\` DROP FOREIGN KEY \`FK_bets_match\``,
    );
    await queryRunner.query(
      `DROP INDEX \`UQ_bets_match_fan\` ON \`bets\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_bets_fan_payment_method\` ON \`bets\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_bets_fan_status\` ON \`bets\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_bets_match_status\` ON \`bets\``,
    );
    await queryRunner.query(`DROP TABLE \`bets\``);
  }
}

