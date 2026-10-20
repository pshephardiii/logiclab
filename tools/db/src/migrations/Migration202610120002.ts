import { Migration } from '@mikro-orm/migrations';

export class Migration202610120002 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table "auth_sessions" (
        "id" varchar(64) not null primary key,
        "user_id" uuid not null references "users" ("id") on delete cascade,
        "encrypted_tokens" text not null,
        "access_expires_at" timestamptz not null,
        "expires_at" timestamptz not null
      );
    `);
    this.addSql('create index "auth_sessions_expires_at_index" on "auth_sessions" ("expires_at");');
  }
  override async down(): Promise<void> { this.addSql('drop table "auth_sessions";'); }
}
