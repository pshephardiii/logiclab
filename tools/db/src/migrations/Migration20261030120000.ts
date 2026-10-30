import { Migration } from '@mikro-orm/migrations';

/** Pre-launch simplification: graded assignments have one point model, not an opt-in mode. */
export class Migration20261030120000 extends Migration {
  override name = 'Migration20261030120000';
  override up(): void {
    this.addSql('lock table "assignments", "assignment_items", "assignment_attempts" in access exclusive mode;');
    this.addSql(`
      do $$
      begin
        if exists (
          select 1
          from assignment_attempts t
          join assignments a
            on a.id = t.assignment_id
          where a.assessment_mode = 'graded'
            and t.submitted_at is not null
            and t.score is null
        ) then
          raise exception 'Reset disposable pre-launch data: unscored graded submissions cannot be migrated without regrading';
        end if;
      end $$;
    `);
    this.addSql(`
      alter table "assignments"
        drop constraint "assignments_scoring_version_check",
        drop column "scoring_version";
    `);
    this.addSql('alter table "assignment_items" drop constraint "assignment_items_max_points_check";');
    this.addSql('update "assignment_items" set "max_points" = 10 where "max_points" is null;');
    this.addSql(`
      alter table "assignment_items"
        alter column "max_points" set default 10,
        alter column "max_points" set not null,
        add constraint "assignment_items_max_points_check" check (max_points between 1 and 1000);
    `);
  }
  override down(): void {
    this.addSql('alter table "assignments" add column "scoring_version" varchar(32) null;');
    this.addSql("update assignments set scoring_version = 'points_v1' where assessment_mode = 'graded';");
    this.addSql(`
      alter table "assignments"
        add constraint "assignments_scoring_version_check"
          check (
            scoring_version is null
            or (scoring_version = 'points_v1' and assessment_mode = 'graded')
          );
    `);
    this.addSql(`
      alter table "assignment_items"
        drop constraint "assignment_items_max_points_check",
        alter column "max_points" drop not null,
        alter column "max_points" drop default;
    `);
    this.addSql(`
      alter table "assignment_items"
        add constraint "assignment_items_max_points_check"
          check (max_points is null or max_points between 1 and 1000);
    `);
  }
}
