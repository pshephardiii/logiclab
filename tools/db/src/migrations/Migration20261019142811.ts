import { Migration } from '@mikro-orm/migrations';

export class Migration20261019142811 extends Migration {

  override name = 'Migration20261019142811';

  override up(): void | Promise<void> {
    this.addSql(`create table "job_schedules" ("id" uuid not null default gen_random_uuid(), "name" varchar(120) not null, "job_type" varchar(64) not null, "enabled" boolean not null default false, "interval_seconds" int not null, "next_run_at" timestamptz not null, "max_attempts" int not null default 3, "created_at" timestamptz not null default now(), primary key ("id"));`);
    this.addSql(`create index "job_schedules_due_index" on "job_schedules" ("enabled", "next_run_at");`);
    this.addSql(`alter table "job_schedules" add constraint "job_schedules_name_unique" unique ("name");`);

    this.addSql(`create table "durable_jobs" ("id" uuid not null default gen_random_uuid(), "job_type" varchar(64) not null, "deduplication_key" varchar(255) not null, "schedule_id" uuid null, "scheduled_for" timestamptz null, "status" varchar(64) not null default 'queued', "available_at" timestamptz not null default now(), "attempts" int not null default 0, "max_attempts" int not null default 3, "lease_token" uuid null, "lease_expires_at" timestamptz null, "completed_at" timestamptz null, "created_at" timestamptz not null default now(), primary key ("id"));`);
    this.addSql(`create index "durable_jobs_lease_index" on "durable_jobs" ("status", "lease_expires_at");`);
    this.addSql(`create index "durable_jobs_available_index" on "durable_jobs" ("status", "available_at");`);
    this.addSql(`alter table "durable_jobs" add constraint "durable_jobs_schedule_occurrence_unique" unique ("schedule_id", "scheduled_for");`);
    this.addSql(`alter table "durable_jobs" add constraint "durable_jobs_type_key_unique" unique ("job_type", "deduplication_key");`);

    this.addSql(`create table "job_runs" ("id" uuid not null default gen_random_uuid(), "job_id" uuid not null, "attempt" int not null, "lease_token" uuid not null, "status" varchar(64) not null default 'running', "started_at" timestamptz not null default now(), "finished_at" timestamptz null, "error_code" varchar(64) null, "records_checked" int not null default 0, "findings_count" int not null default 0, primary key ("id"));`);
    this.addSql(`alter table "job_runs" add constraint "job_runs_lease_unique" unique ("lease_token");`);
    this.addSql(`alter table "job_runs" add constraint "job_runs_job_attempt_unique" unique ("job_id", "attempt");`);

    this.addSql(`create table "reconciliation_findings" ("id" uuid not null default gen_random_uuid(), "job_id" uuid not null, "kind" varchar(64) not null, "purchase_id" uuid not null, "class_id" uuid not null, "grant_id" uuid null, "detected_at" timestamptz not null default now(), primary key ("id"));`);
    this.addSql(`alter table "reconciliation_findings" add constraint "reconciliation_findings_job_kind_purchase_unique" unique ("job_id", "kind", "purchase_id");`);

    this.addSql(`alter table "job_schedules" add constraint "job_schedules_attempts_check" check (max_attempts between 1 and 10);`);
    this.addSql(`alter table "job_schedules" add constraint "job_schedules_interval_check" check (interval_seconds > 0);`);
    this.addSql(`alter table "job_schedules" add constraint "job_schedules_type_check" check (job_type in ('billing_reconciliation'));`);

    this.addSql(`alter table "durable_jobs" add constraint "durable_jobs_schedule_id_fkey" foreign key ("schedule_id") references "job_schedules" ("id") on delete restrict;`);
    this.addSql(`alter table "durable_jobs" add constraint "durable_jobs_state_check" check ((status = 'queued' and attempts < max_attempts and lease_token is null and lease_expires_at is null and completed_at is null) or (status = 'running' and attempts > 0 and lease_token is not null and lease_expires_at is not null and completed_at is null) or (status in ('succeeded', 'failed') and attempts > 0 and lease_token is null and lease_expires_at is null and completed_at is not null));`);
    this.addSql(`alter table "durable_jobs" add constraint "durable_jobs_attempts_check" check (max_attempts between 1 and 10 and attempts between 0 and max_attempts);`);
    this.addSql(`alter table "durable_jobs" add constraint "durable_jobs_occurrence_check" check ((schedule_id is null) = (scheduled_for is null));`);
    this.addSql(`alter table "durable_jobs" add constraint "durable_jobs_type_check" check (job_type in ('billing_reconciliation'));`);

    this.addSql(`alter table "job_runs" add constraint "job_runs_job_id_fkey" foreign key ("job_id") references "durable_jobs" ("id") on delete restrict;`);
    this.addSql(`alter table "job_runs" add constraint "job_runs_state_check" check ((status = 'running' and finished_at is null and error_code is null) or (status = 'succeeded' and finished_at is not null and error_code is null) or (status in ('failed', 'lease_expired') and finished_at is not null and error_code is not null));`);
    this.addSql(`alter table "job_runs" add constraint "job_runs_finished_check" check (finished_at is null or finished_at >= started_at);`);
    this.addSql(`alter table "job_runs" add constraint "job_runs_counts_check" check (records_checked >= 0 and findings_count >= 0);`);
    this.addSql(`alter table "job_runs" add constraint "job_runs_attempt_check" check (attempt between 1 and 10);`);

    this.addSql(`alter table "reconciliation_findings" add constraint "reconciliation_findings_job_id_fkey" foreign key ("job_id") references "durable_jobs" ("id") on delete restrict;`);
    this.addSql(`alter table "reconciliation_findings" add constraint "reconciliation_findings_kind_check" check (kind in ('refunded_purchase_active_grant', 'paid_purchase_missing_grant', 'purchase_grant_terms_mismatch'));`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "durable_jobs" drop constraint "durable_jobs_schedule_id_fkey";`);
    this.addSql(`alter table "job_runs" drop constraint "job_runs_job_id_fkey";`);
    this.addSql(`alter table "reconciliation_findings" drop constraint "reconciliation_findings_job_id_fkey";`);

    this.addSql(`drop table if exists "job_schedules" cascade;`);
    this.addSql(`drop table if exists "durable_jobs" cascade;`);
    this.addSql(`drop table if exists "job_runs" cascade;`);
    this.addSql(`drop table if exists "reconciliation_findings" cascade;`);
  }

}
