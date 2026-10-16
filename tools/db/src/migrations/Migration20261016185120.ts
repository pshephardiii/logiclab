import { Migration } from '@mikro-orm/migrations';

export class Migration20261016185120 extends Migration {

  override name = 'Migration20261016185120';

  override up(): void | Promise<void> {
    this.addSql(`create table "payment_events" ("id" uuid not null default gen_random_uuid(), "provider" varchar(32) not null, "event_id" varchar(255) not null, "source_reference" varchar(255) not null, "sequence" int not null, "payload_hash" varchar(64) not null, "processed_at" timestamptz not null default now(), primary key ("id"));`);
    this.addSql(`create index "payment_events_source_index" on "payment_events" ("provider", "source_reference");`);
    this.addSql(`alter table "payment_events" add constraint "payment_events_provider_event_unique" unique ("provider", "event_id");`);

    this.addSql(`create table "class_entitlements" ("id" uuid not null default gen_random_uuid(), "classroom_id" uuid not null, "source" varchar(32) not null, "provider" varchar(32) not null, "source_reference" varchar(255) not null, "capability" varchar(32) not null default 'publish_assignments', "starts_at" timestamptz not null, "ends_at" timestamptz not null, "revoked_at" timestamptz null, "created_at" timestamptz not null default now(), primary key ("id"));`);
    this.addSql(`create index "class_entitlements_classroom_index" on "class_entitlements" ("classroom_id");`);
    this.addSql(`alter table "class_entitlements" add constraint "class_entitlements_source_unique" unique ("provider", "source", "source_reference", "classroom_id", "capability");`);

    this.addSql(`create table "class_purchases" ("id" uuid not null default gen_random_uuid(), "classroom_id" uuid not null, "payer_id" uuid not null, "provider" varchar(32) not null, "checkout_reference" varchar(255) not null, "status" varchar(32) not null default 'pending', "amount_minor" int not null, "currency" varchar(3) not null, "coverage_days" int not null, "last_event_sequence" int not null default 0, "created_at" timestamptz not null default now(), primary key ("id"));`);
    this.addSql(`create index "class_purchases_classroom_index" on "class_purchases" ("classroom_id");`);
    this.addSql(`alter table "class_purchases" add constraint "class_purchases_provider_checkout_unique" unique ("provider", "checkout_reference");`);

    this.addSql(`alter table "payment_events" add constraint "payment_events_hash_check" check (payload_hash ~ '^[0-9a-f]{64}\$');`);
    this.addSql(`alter table "payment_events" add constraint "payment_events_sequence_check" check (sequence > 0);`);

    this.addSql(`alter table "class_entitlements" add constraint "class_entitlements_classroom_id_fkey" foreign key ("classroom_id") references "classrooms" ("id") on delete restrict;`);
    this.addSql(`alter table "class_entitlements" add constraint "class_entitlements_period_check" check (ends_at > starts_at);`);
    this.addSql(`alter table "class_entitlements" add constraint "class_entitlements_capability_check" check (capability in ('publish_assignments'));`);
    this.addSql(`alter table "class_entitlements" add constraint "class_entitlements_source_check" check (source in ('class_purchase'));`);

    this.addSql(`alter table "class_purchases" add constraint "class_purchases_classroom_id_fkey" foreign key ("classroom_id") references "classrooms" ("id") on delete restrict;`);
    this.addSql(`alter table "class_purchases" add constraint "class_purchases_payer_id_fkey" foreign key ("payer_id") references "users" ("id") on delete restrict;`);
    this.addSql(`alter table "class_purchases" add constraint "class_purchases_currency_check" check (currency ~ '^[A-Z]{3}\$');`);
    this.addSql(`alter table "class_purchases" add constraint "class_purchases_sequence_check" check (last_event_sequence >= 0);`);
    this.addSql(`alter table "class_purchases" add constraint "class_purchases_coverage_check" check (coverage_days > 0);`);
    this.addSql(`alter table "class_purchases" add constraint "class_purchases_amount_check" check (amount_minor >= 0);`);
    this.addSql(`alter table "class_purchases" add constraint "class_purchases_status_check" check (status in ('pending', 'paid', 'failed', 'refunded'));`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "payment_events" cascade;`);
    this.addSql(`drop table if exists "class_entitlements" cascade;`);
    this.addSql(`drop table if exists "class_purchases" cascade;`);
  }

}
