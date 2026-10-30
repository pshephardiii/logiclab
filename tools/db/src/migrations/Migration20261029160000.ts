import { Migration } from '@mikro-orm/migrations';

/** Stage opt-in point scoring without modifying historical allocations or final results. */
export class Migration20261029160000 extends Migration {
  override name = 'Migration20261029160000';

  override up(): void {
    this.addSql(`
      alter table "assignments"
        add column "scoring_version" varchar(32) null,
        add constraint "assignments_scoring_version_check"
          check (scoring_version is null or (scoring_version = 'points_v1' and assessment_mode = 'graded'));
    `);
    this.addSql(`
      alter table "assignment_items"
        add column "max_points" int null,
        add constraint "assignment_items_max_points_check"
          check (max_points is null or max_points between 1 and 1000);
    `);
    this.addSql(`
      alter table "assignment_attempts"
        add column "score" jsonb null,
        add constraint "assignment_attempts_score_state_check"
          check (
            score is null or coalesce(
              submitted_at is not null
              and result->>'gradingVersion' in ('truth_table_v1', 'mixed_v1')
              and jsonb_typeof(score) = 'object'
              and score->>'scoringVersion' = 'points_v1',
              false
            )
          );
    `);
  }

  override down(): void {
    // Exclude concurrent scoring writes between the refusal check and dropping columns.
    this.addSql('lock table "assignments", "assignment_items", "assignment_attempts" in access exclusive mode;');
    this.addSql(`
      do $$
      begin
        if exists (select 1 from "assignments" where "scoring_version" is not null)
          or exists (select 1 from "assignment_items" where "max_points" is not null)
          or exists (select 1 from "assignment_attempts" where "score" is not null)
        then
          raise exception 'Cannot roll back assignment scoring while scoring data exists';
        end if;
      end $$;
    `);
    this.addSql('alter table "assignment_attempts" drop constraint "assignment_attempts_score_state_check", drop column "score";');
    this.addSql('alter table "assignment_items" drop constraint "assignment_items_max_points_check", drop column "max_points";');
    this.addSql('alter table "assignments" drop constraint "assignments_scoring_version_check", drop column "scoring_version";');
  }
}
