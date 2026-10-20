import { Migration } from '@mikro-orm/migrations';

export class Migration20261016165932 extends Migration {

  override name = 'Migration20261016165932';

  override up(): void | Promise<void> {
    this.addSql(`
      create table "assignment_attempts" (
        "id" uuid not null default gen_random_uuid(),
        "assignment_id" uuid not null,
        "student_id" uuid not null,
        "answers" jsonb not null default '{}',
        "revision" int not null default 0,
        "submitted_at" timestamptz null,
        "result" jsonb null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        primary key ("id")
      );
    `);
    this.addSql(`
      alter table "assignment_attempts"
        add constraint "assignment_attempts_assignment_student_unique" unique ("assignment_id", "student_id");
    `);

    this.addSql(`
      alter table "assignment_attempts"
        add constraint "assignment_attempts_assignment_id_fkey"
          foreign key ("assignment_id")
          references "assignments" ("id")
          on delete restrict;
    `);
    this.addSql(`
      alter table "assignment_attempts"
        add constraint "assignment_attempts_student_id_fkey"
          foreign key ("student_id")
          references "users" ("id")
          on delete restrict;
    `);
    this.addSql(`
      alter table "assignment_attempts"
        add constraint "assignment_attempts_submission_result_check"
          check ((submitted_at is null) = (result is null));
    `);
    this.addSql(`
      alter table "assignment_attempts"
        add constraint "assignment_attempts_revision_nonnegative"
          check (revision >= 0);
    `);
    this.addSql(`
      create or replace function "assignment_attempts_assignment_attempts_submitted_immutable_fn"() returns trigger as
      $$
      begin
        if OLD.submitted_at is not null then
          raise exception 'Submitted attempts are immutable' using errcode = '23514';
        end if;
        if TG_OP = 'DELETE' then
          return OLD;
        end if;
        return NEW;
      end;
      $$ language plpgsql;
    `);
    this.addSql(`
      create trigger "assignment_attempts_submitted_immutable"
        BEFORE UPDATE OR DELETE on "assignment_attempts"
        for each ROW
        execute function "assignment_attempts_assignment_attempts_submitted_immutable_fn"();
    `);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop trigger if exists "assignment_attempts_submitted_immutable" on "assignment_attempts";`);
    this.addSql(`drop function if exists "assignment_attempts_assignment_attempts_submitted_immutable_fn"();`);
    this.addSql(`drop table if exists "assignment_attempts" cascade;`);
  }

}
