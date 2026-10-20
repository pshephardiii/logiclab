import { Migration } from '@mikro-orm/migrations';

export class Migration202610120003 extends Migration {
  override async up(): Promise<void> {
    this.addSql('alter table "users" add column "email" text null;');
    this.addSql(`
      alter table "users"
        add constraint "users_pool_email_unique" unique ("cognito_user_pool_id", "email");
    `);
  }
  override async down(): Promise<void> {
    this.addSql('alter table "users" drop constraint "users_pool_email_unique";');
    this.addSql('alter table "users" drop column "email";');
  }
}
