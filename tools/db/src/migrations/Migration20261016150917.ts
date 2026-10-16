import { Migration } from '@mikro-orm/migrations';

export class Migration20261016150917 extends Migration {

  override name = 'Migration20261016150917';

  override up(): void | Promise<void> {
    this.addSql(`create table "assignments" ("id" uuid not null default gen_random_uuid(), "classroom_id" uuid not null, "title" varchar(120) not null, "instructions" text null, "assessment_mode" varchar(32) not null default 'graded', "feedback_timing" varchar(32) not null default 'on_submission', "allow_solutions" boolean not null default false, "published_at" timestamptz null, "archived_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), primary key ("id"));`);
    this.addSql(`create index "assignments_classroom_id_index" on "assignments" ("classroom_id");`);

    this.addSql(`create table "assignment_items" ("id" uuid not null default gen_random_uuid(), "assignment_id" uuid not null, "problem_version_id" uuid not null, "position" int not null, primary key ("id"));`);
    this.addSql(`alter table "assignment_items" add constraint "assignment_items_assignment_position_unique" unique ("assignment_id", "position");`);

    this.addSql(`alter table "assignments" add constraint "assignments_classroom_id_fkey" foreign key ("classroom_id") references "classrooms" ("id") on delete restrict;`);
    this.addSql(`alter table "assignments" add constraint "assignments_feedback_timing_check" check (feedback_timing = 'on_submission');`);
    this.addSql(`alter table "assignments" add constraint "assignments_assessment_mode_check" check (assessment_mode = 'graded');`);

    this.addSql(`alter table "assignment_items" add constraint "assignment_items_assignment_id_fkey" foreign key ("assignment_id") references "assignments" ("id") on delete restrict;`);
    this.addSql(`alter table "assignment_items" add constraint "assignment_items_problem_version_id_fkey" foreign key ("problem_version_id") references "problem_versions" ("id") on delete restrict;`);
    this.addSql(`alter table "assignment_items" add constraint "assignment_items_positive_position" check (position > 0);`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "assignment_items" drop constraint "assignment_items_assignment_id_fkey";`);

    this.addSql(`drop table if exists "assignments" cascade;`);
    this.addSql(`drop table if exists "assignment_items" cascade;`);
  }

}
