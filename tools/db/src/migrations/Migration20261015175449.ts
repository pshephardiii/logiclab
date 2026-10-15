import { Migration } from '@mikro-orm/migrations';

export class Migration20261015175449 extends Migration {

  override name = 'Migration20261015175449';

  override up(): void | Promise<void> {
    this.addSql(`create table "problems" ("id" uuid not null default gen_random_uuid(), "title" varchar(120) not null, "instructions" text null, "definition" jsonb not null, "owner_id" uuid not null, "archived_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), primary key ("id"));`);
    this.addSql(`create index "problems_owner_id_index" on "problems" ("owner_id");`);

    this.addSql(`create table "problem_versions" ("id" uuid not null default gen_random_uuid(), "title" varchar(120) not null, "instructions" text null, "definition" jsonb not null, "problem_id" uuid not null, "version" int not null, "published_at" timestamptz not null default now(), primary key ("id"));`);
    this.addSql(`alter table "problem_versions" add constraint "problem_versions_problem_version_unique" unique ("problem_id", "version");`);

    this.addSql(`alter table "problems" add constraint "problems_owner_id_fkey" foreign key ("owner_id") references "users" ("id") on delete restrict;`);

    this.addSql(`alter table "problem_versions" add constraint "problem_versions_problem_id_fkey" foreign key ("problem_id") references "problems" ("id") on delete restrict;`);
    this.addSql(`alter table "problem_versions" add constraint "problem_versions_positive_version" check (version > 0);`);
    // Immutable snapshots are protected even when callers bypass the ORM.
    this.addSql(`create function reject_problem_version_mutation() returns trigger language plpgsql as $$
      begin
        raise exception 'Published problem versions are immutable' using errcode = '23514';
      end;
    $$;`);
    this.addSql(`create trigger problem_versions_immutable before update or delete on problem_versions
      for each row execute function reject_problem_version_mutation();`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop trigger if exists problem_versions_immutable on problem_versions;`);
    this.addSql(`drop function if exists reject_problem_version_mutation();`);
    this.addSql(`alter table "problem_versions" drop constraint "problem_versions_problem_id_fkey";`);

    this.addSql(`drop table if exists "problems" cascade;`);
    this.addSql(`drop table if exists "problem_versions" cascade;`);
  }

}
