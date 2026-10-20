import { Migration } from '@mikro-orm/migrations';

export class Migration202610120004 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table "classrooms" (
        "id" uuid not null default gen_random_uuid(),
        "name" varchar(120) not null,
        "owner_id" uuid not null,
        "created_at" timestamptz not null default now(),
        constraint "classrooms_pkey" primary key ("id")
      );
    `);
    this.addSql('create index "classrooms_owner_id_index" on "classrooms" ("owner_id");');
    this.addSql(`
      alter table "classrooms"
        add constraint "classrooms_owner_id_fkey"
          foreign key ("owner_id")
          references "users" ("id")
          on delete restrict;
    `);
  }
  override async down(): Promise<void> {
    this.addSql('drop table "classrooms";');
  }
}
