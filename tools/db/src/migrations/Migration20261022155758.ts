import { Migration } from '@mikro-orm/migrations';

export class Migration20261022155758 extends Migration {

  override name = 'Migration20261022155758';

  override up(): void | Promise<void> {
    this.addSql(`alter table "assignments" drop constraint "assignments_assessment_mode_check";`);
    this.addSql(`alter table "assignments" drop constraint "assignments_feedback_timing_check";`);
    this.addSql(`
      alter table "assignments"
        add constraint "assignments_learning_policy_check"
        check (
          (assessment_mode = 'graded' and feedback_timing = 'on_submission')
          or (
            assessment_mode in ('completion_only', 'ungraded_practice')
            and feedback_timing = 'on_check'
          )
        );
    `);
    this.addSql(`
      alter table "assignments"
        add constraint "assignments_assessment_mode_check"
        check (assessment_mode in ('graded', 'completion_only', 'ungraded_practice'));
    `);
    this.addSql(`
      alter table "assignments"
        add constraint "assignments_feedback_timing_check"
        check (feedback_timing in ('on_submission', 'on_check'));
    `);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "assignments" drop constraint "assignments_learning_policy_check";`);
    this.addSql(`alter table "assignments" drop constraint "assignments_feedback_timing_check";`);
    this.addSql(`alter table "assignments" drop constraint "assignments_assessment_mode_check";`);
    this.addSql(`
      alter table "assignments"
        add constraint "assignments_feedback_timing_check"
        check (feedback_timing in ('on_submission'));
    `);
    this.addSql(`
      alter table "assignments"
        add constraint "assignments_assessment_mode_check"
        check (assessment_mode in ('graded'));
    `);
  }

}
