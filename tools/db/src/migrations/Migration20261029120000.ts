import { Migration } from '@mikro-orm/migrations';

/** Add independent release state without changing any existing assignment policy or result. */
export class Migration20261029120000 extends Migration {
  override name = 'Migration20261029120000';

  override up(): void {
    this.addSql(`
      alter table "assignments"
        add column "grade_release_timing" varchar(32) not null default 'on_submission',
        add column "grades_released_at" timestamptz null,
        add column "grades_released_by_id" uuid null,
        add column "answers_revealed_at" timestamptz null,
        add column "answers_revealed_by_id" uuid null,
        add constraint "assignments_grades_released_by_id_fkey"
          foreign key ("grades_released_by_id") references "users" ("id") on delete restrict,
        add constraint "assignments_answers_revealed_by_id_fkey"
          foreign key ("answers_revealed_by_id") references "users" ("id") on delete restrict;
    `);
    this.addSql(`alter table "assignments" drop constraint "assignments_learning_policy_check";`);
    this.addSql(`alter table "assignments" drop constraint "assignments_solution_access_check";`);
    this.addSql(`alter table "assignments" drop constraint "assignments_practice_solution_check";`);
    this.addSql(`
      alter table "assignments"
        add constraint "assignments_learning_policy_check"
        check (
          (assessment_mode = 'graded' and feedback_timing = 'on_submission')
          or (
            assessment_mode = 'completion_only'
            and feedback_timing in ('on_submission', 'on_check', 'immediate')
          )
          or (
            assessment_mode = 'ungraded_practice'
            and feedback_timing in ('on_check', 'immediate')
          )
        );
    `);
    this.addSql(`
      alter table "assignments"
        add constraint "assignments_solution_access_check"
        check (solution_access in ('never', 'after_submission', 'anytime', 'instructor_release'));
    `);
    this.addSql(`
      alter table "assignments"
        add constraint "assignments_practice_solution_check"
        check (assessment_mode <> 'ungraded_practice' or solution_access in ('never', 'anytime'));
    `);
    this.addSql(`
      alter table "assignments"
        add constraint "assignments_grade_release_timing_check"
        check (
          grade_release_timing in ('on_submission', 'instructor_release')
          and (assessment_mode = 'graded' or grade_release_timing = 'on_submission')
        );
    `);
    this.addSql(`
      alter table "assignments"
        add constraint "assignments_grade_release_state_check"
        check (
          (grades_released_at is null and grades_released_by_id is null)
          or (
            grades_released_at is not null
            and grades_released_by_id is not null
            and assessment_mode = 'graded'
            and grade_release_timing = 'instructor_release'
            and published_at is not null
            and grades_released_at >= published_at
          )
        );
    `);
    this.addSql(`
      alter table "assignments"
        add constraint "assignments_answer_reveal_state_check"
        check (
          (answers_revealed_at is null and answers_revealed_by_id is null)
          or (
            answers_revealed_at is not null
            and answers_revealed_by_id is not null
            and assessment_mode in ('graded', 'completion_only')
            and solution_access = 'instructor_release'
            and published_at is not null
            and answers_revealed_at >= published_at
          )
        );
    `);
  }

  override down(): void {
    this.addSql(`
      do $$
      begin
        if exists (
          select 1
          from assignments
          where grade_release_timing <> 'on_submission'
            or solution_access = 'instructor_release'
            or grades_released_at is not null
            or answers_revealed_at is not null
            or (assessment_mode = 'completion_only' and feedback_timing = 'on_submission')
        ) then
          raise exception 'Cannot roll back independent release while assignments use new policies or release history';
        end if;
      end;
      $$;
    `);
    this.addSql(`alter table "assignments" drop constraint "assignments_learning_policy_check";`);
    this.addSql(`alter table "assignments" drop constraint "assignments_solution_access_check";`);
    this.addSql(`alter table "assignments" drop constraint "assignments_practice_solution_check";`);
    this.addSql(`alter table "assignments" drop constraint "assignments_grade_release_timing_check";`);
    this.addSql(`alter table "assignments" drop constraint "assignments_grade_release_state_check";`);
    this.addSql(`alter table "assignments" drop constraint "assignments_answer_reveal_state_check";`);
    this.addSql(`
      alter table "assignments"
        drop column "grade_release_timing",
        drop column "grades_released_at",
        drop column "grades_released_by_id",
        drop column "answers_revealed_at",
        drop column "answers_revealed_by_id";
    `);
    this.addSql(`
      alter table "assignments"
        add constraint "assignments_learning_policy_check"
        check (
          (assessment_mode = 'graded' and feedback_timing = 'on_submission')
          or (assessment_mode in ('completion_only', 'ungraded_practice') and feedback_timing in ('on_check', 'immediate'))
        ),
        add constraint "assignments_solution_access_check"
        check (solution_access in ('never', 'after_submission', 'anytime')),
        add constraint "assignments_practice_solution_check"
        check (assessment_mode <> 'ungraded_practice' or solution_access <> 'after_submission');
    `);
  }
}
