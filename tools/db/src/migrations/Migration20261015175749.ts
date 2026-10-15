import { Migration } from '@mikro-orm/migrations';

export class Migration20261015175749 extends Migration {

  override name = 'Migration20261015175749';

  override up(): void | Promise<void> {
    this.addSql(`drop trigger if exists "problem_versions_immutable" on "problem_versions";`);
    this.addSql(`drop function if exists "problem_versions_problem_versions_immutable_fn"();`);
    this.addSql(`create or replace function "problem_versions_problem_versions_immutable_fn"() returns trigger as \$\$ begin raise exception 'Published problem versions are immutable' using errcode = '23514'; end; \$\$ language plpgsql;`);
    this.addSql(`create trigger "problem_versions_immutable" BEFORE UPDATE OR DELETE on "problem_versions" for each ROW execute function "problem_versions_problem_versions_immutable_fn"();`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop trigger if exists "problem_versions_immutable" on "problem_versions";`);
    this.addSql(`drop function if exists "problem_versions_problem_versions_immutable_fn"();`);
    // Restore the trigger installed by the preceding migration, including its behavior.
    this.addSql(`create trigger problem_versions_immutable before update or delete on problem_versions
      for each row execute function reject_problem_version_mutation();`);
  }
}
