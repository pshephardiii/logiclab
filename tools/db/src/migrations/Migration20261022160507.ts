import { Migration } from '@mikro-orm/migrations';

export class Migration20261022160507 extends Migration {
  override name = 'Migration20261022160507';

  override up(): void {
    this.addSql(`
      alter table "assignments"
        add "solution_access" varchar(32) not null default 'never';
    `);
    this.addSql(`
      update "assignments"
      set solution_access = case
        when allow_solutions then 'after_submission'
        else 'never'
      end;
    `);
    this.addSql('alter table "assignments" drop column "allow_solutions";');
    this.addSql(`
      alter table "assignments"
        add constraint "assignments_practice_solution_check"
        check (assessment_mode <> 'ungraded_practice' or solution_access <> 'after_submission');
    `);
    this.addSql(`
      alter table "assignments"
        add constraint "assignments_solution_access_check"
        check (solution_access in ('never', 'after_submission', 'anytime'));
    `);
  }

  override down(): void {
    // The old boolean cannot preserve anytime access; fail rather than silently change policy.
    this.addSql(`
      do $$
      begin
        if exists (select 1 from "assignments" where solution_access = 'anytime') then
          raise exception 'Cannot roll back solution access while anytime assignments exist';
        end if;
      end
      $$;
    `);
    this.addSql('alter table "assignments" add "allow_solutions" boolean not null default false;');
    this.addSql(`
      update "assignments"
      set allow_solutions = (solution_access = 'after_submission');
    `);
    this.addSql('alter table "assignments" drop constraint "assignments_practice_solution_check";');
    this.addSql('alter table "assignments" drop constraint "assignments_solution_access_check";');
    this.addSql('alter table "assignments" drop column "solution_access";');
  }
}
