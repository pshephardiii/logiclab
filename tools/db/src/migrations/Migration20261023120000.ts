import { Migration } from '@mikro-orm/migrations';

export class Migration20261023120000 extends Migration {
  override name = 'Migration20261023120000';

  override up(): void {
    this.replaceChecks("'on_submission', 'on_check', 'immediate'", "in ('on_check', 'immediate')");
  }

  override down(): void {
    this.addSql(`
      do $$
      begin
        if exists (select 1 from assignments where feedback_timing = 'immediate') then
          raise exception 'Cannot roll back immediate feedback while assignments use it';
        end if;
      end;
      $$;
    `);
    this.replaceChecks("'on_submission', 'on_check'", "= 'on_check'");
  }

  private replaceChecks(timings: string, practiceTiming: string): void {
    this.addSql(`alter table "assignments" drop constraint "assignments_feedback_timing_check";`);
    this.addSql(`alter table "assignments" drop constraint "assignments_learning_policy_check";`);
    this.addSql(`
      alter table "assignments"
        add constraint "assignments_feedback_timing_check"
        check (feedback_timing in (${timings}));
    `);
    this.addSql(`
      alter table "assignments"
        add constraint "assignments_learning_policy_check"
        check (
          (assessment_mode = 'graded' and feedback_timing = 'on_submission')
          or (
            assessment_mode in ('completion_only', 'ungraded_practice')
            and feedback_timing ${practiceTiming}
          )
        );
    `);
  }
}
