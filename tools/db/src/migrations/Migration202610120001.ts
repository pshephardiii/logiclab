import { Migration } from '@mikro-orm/migrations';

export class Migration202610120001 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create type "user_role" as enum ('student', 'instructor');`);
    this.addSql(`create table "users" (
      "id" uuid not null default gen_random_uuid(),
      "cognito_user_pool_id" text not null,
      "cognito_subject" text not null,
      "role" "user_role" not null,
      "created_at" timestamptz not null default now(),
      constraint "users_pkey" primary key ("id"),
      constraint "users_cognito_identity_unique" unique ("cognito_user_pool_id", "cognito_subject")
    );`);
  }

  override async down(): Promise<void> {
    this.addSql('drop table "users";');
    this.addSql('drop type "user_role";');
  }
}
