import { Migration } from '@mikro-orm/migrations';

export class Migration20261019174907 extends Migration {

  override name = 'Migration20261019174907';

  override up(): void | Promise<void> {
    this.addSql(`create table "demo_workspaces" ("id" uuid not null default gen_random_uuid(), "status" varchar(32) not null default 'provisioning', "template_version" int not null, "generation" int not null default 1, "created_at" timestamptz not null, "last_activity_at" timestamptz not null, "idle_expires_at" timestamptz not null, "expires_at" timestamptz not null, primary key ("id"));`);
    this.addSql(`create index "demo_workspaces_expiry_index" on "demo_workspaces" ("expires_at", "id");`);
    this.addSql(`create index "demo_workspaces_idle_expiry_index" on "demo_workspaces" ("idle_expires_at", "id");`);

    this.addSql(`alter table "demo_workspaces" add constraint "demo_workspaces_lifetime_check" check (created_at <= last_activity_at and last_activity_at < idle_expires_at and idle_expires_at <= expires_at);`);
    this.addSql(`alter table "demo_workspaces" add constraint "demo_workspaces_version_check" check (template_version > 0 and generation > 0);`);
    this.addSql(`alter table "demo_workspaces" add constraint "demo_workspaces_status_check" check (status in ('provisioning', 'active', 'resetting', 'expired'));`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "demo_workspaces" cascade;`);
  }

}
