import { Migration } from '@mikro-orm/migrations';

export class Migration20261016190233 extends Migration {

  override name = 'Migration20261016190233';

  override up(): void | Promise<void> {
    this.addSql(`create table "billing_plans" ("id" uuid not null default gen_random_uuid(), "name" varchar(120) not null, "billing_model" varchar(32) not null, "amount_minor" int not null, "currency" varchar(3) not null, "capability" varchar(32) not null, "coverage_days" int null, "billing_interval" varchar(32) null, "active" boolean not null default true, "created_at" timestamptz not null default now(), primary key ("id"));`);

    this.addSql(`alter table "class_purchases" add "plan_id" uuid null, add "capability" varchar(32) not null default 'publish_assignments';`);
    // Retain any purchases created before plans existed; retired plans are not checkout choices.
    this.addSql(`insert into "billing_plans" ("id", "name", "billing_model", "amount_minor", "currency", "capability", "coverage_days", "active", "created_at") select "id", 'Historical class purchase', 'one_time', "amount_minor", "currency", "capability", "coverage_days", false, "created_at" from "class_purchases";`);
    this.addSql(`update "class_purchases" set "plan_id" = "id";`);
    this.addSql(`alter table "class_purchases" alter column "plan_id" set not null;`);
    this.addSql(`alter table "class_purchases" add constraint "class_purchases_plan_id_fkey" foreign key ("plan_id") references "billing_plans" ("id") on delete restrict;`);
    this.addSql(`alter table "class_purchases" add constraint "class_purchases_capability_check" check (capability in ('publish_assignments'));`);

    this.addSql(`alter table "billing_plans" add constraint "billing_plans_terms_check" check ((billing_model = 'one_time' and coverage_days is not null and coverage_days > 0 and billing_interval is null) or (billing_model = 'recurring' and coverage_days is null and billing_interval is not null and billing_interval in ('month', 'year')));`);
    this.addSql(`alter table "billing_plans" add constraint "billing_plans_capability_check" check (capability in ('publish_assignments'));`);
    this.addSql(`alter table "billing_plans" add constraint "billing_plans_currency_check" check (currency ~ '^[A-Z]{3}\$');`);
    this.addSql(`alter table "billing_plans" add constraint "billing_plans_amount_check" check (amount_minor >= 0);`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "class_purchases" drop constraint "class_purchases_plan_id_fkey";`);

    this.addSql(`drop table if exists "billing_plans" cascade;`);

    this.addSql(`alter table "class_purchases" drop constraint "class_purchases_capability_check";`);
    this.addSql(`alter table "class_purchases" drop column "plan_id", drop column "capability";`);
  }

}
