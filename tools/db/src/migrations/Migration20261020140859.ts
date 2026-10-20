import { Migration } from '@mikro-orm/migrations';

export class Migration20261020140859 extends Migration {

  override name = 'Migration20261020140859';

  override up(): void | Promise<void> {
    this.addSql(`
      create table "demo_sessions" (
        "id" varchar(64) not null,
        "workspace_id" uuid not null,
        "generation" int not null,
        "selected_role" varchar(16) not null,
        "created_at" timestamptz not null,
        primary key ("id")
      );
    `);
    this.addSql(`create index "demo_sessions_workspace_id_index" on "demo_sessions" ("workspace_id");`);

    this.addSql(`
      alter table "users"
        add "identity_provider" varchar(16) not null default 'cognito',
        add "demo_workspace_id" uuid null;
    `);
    this.addSql(`
      alter table "users"
        add constraint "users_demo_workspace_id_fkey"
          foreign key ("demo_workspace_id")
          references "demo_workspaces" ("id")
          on delete restrict;
    `);
    this.addSql(`alter table "users" alter column "cognito_subject" drop not null;`);
    this.addSql(`alter table "users" alter column "cognito_user_pool_id" drop not null;`);
    this.addSql(`
      alter table "users"
        add constraint "users_demo_workspace_role_unique" unique ("demo_workspace_id", "role");
    `);
    this.addSql(`
      alter table "users"
        add constraint "users_identity_check"
          check (
            (identity_provider = 'cognito'
              and cognito_user_pool_id is not null
              and cognito_subject is not null
              and demo_workspace_id is null)
            or (identity_provider = 'demo'
              and cognito_user_pool_id is null
              and cognito_subject is null
              and email is null
              and demo_workspace_id is not null)
          );
    `);

    this.addSql(`
      alter table "demo_sessions"
        add constraint "demo_sessions_workspace_id_fkey"
          foreign key ("workspace_id")
          references "demo_workspaces" ("id")
          on delete cascade;
    `);
    this.addSql(`
      alter table "demo_sessions"
        add constraint "demo_sessions_role_check"
          check (selected_role in ('student', 'instructor'));
    `);
    this.addSql(`
      alter table "demo_sessions"
        add constraint "demo_sessions_generation_check"
          check (generation > 0);
    `);
    this.addSql(`
      alter table "demo_sessions"
        add constraint "demo_sessions_hash_check"
          check (id ~ '^[0-9a-f]{64}$');
    `);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "demo_sessions" cascade;`);

    this.addSql(`alter table "users" drop constraint "users_demo_workspace_id_fkey";`);

    this.addSql(`alter table "users" drop constraint "users_demo_workspace_role_unique";`);
    this.addSql(`alter table "users" drop constraint "users_identity_check";`);
    this.addSql(`alter table "users" drop column "identity_provider", drop column "demo_workspace_id";`);
    this.addSql(`alter table "users" alter column "cognito_user_pool_id" set not null;`);
    this.addSql(`alter table "users" alter column "cognito_subject" set not null;`);
  }

}
