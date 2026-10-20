import { Migration } from '@mikro-orm/migrations';

export class Migration20261020145405 extends Migration {

  override name = 'Migration20261020145405';

  override up(): void | Promise<void> {
    this.addSql(`drop trigger if exists "problem_versions_immutable" on "problem_versions";`);
    this.addSql(`drop function if exists "problem_versions_problem_versions_immutable_fn"();`);
    this.addSql(`create or replace function "problem_versions_problem_versions_immutable_fn"() returns trigger as \$\$ begin if TG_OP = 'DELETE' then
  declare permitted boolean := false;   begin
    execute format('select true from %I.problems p join %I.users u on u.id = p.owner_id join %I.demo_workspaces w on w.id = u.demo_workspace_id where p.id = \$1 and u.identity_provider = ''demo'' and w.status in (''resetting'', ''expired'') for update of w', TG_TABLE_SCHEMA, TG_TABLE_SCHEMA, TG_TABLE_SCHEMA)
      into permitted using OLD.problem_id;     if permitted then return OLD; end if;   end; end if; raise exception 'Published problem versions are immutable' using errcode = '23514'; end; \$\$ language plpgsql;`);
    this.addSql(`create trigger "problem_versions_immutable" BEFORE UPDATE OR DELETE on "problem_versions" for each ROW execute function "problem_versions_problem_versions_immutable_fn"();`);

    this.addSql(`drop trigger if exists "assignment_attempts_submitted_immutable" on "assignment_attempts";`);
    this.addSql(`drop function if exists "assignment_attempts_assignment_attempts_submitted_immutable_fn"();`);
    this.addSql(`create or replace function "assignment_attempts_assignment_attempts_submitted_immutable_fn"() returns trigger as \$\$ begin if OLD.submitted_at is not null then
  if TG_OP = 'DELETE' then
    declare permitted boolean := false;     begin
      execute format('select true from %I.assignments a join %I.classrooms c on c.id = a.classroom_id join %I.users owner_user on owner_user.id = c.owner_id join %I.users student_user on student_user.id = \$2 join %I.demo_workspaces w on w.id = owner_user.demo_workspace_id and w.id = student_user.demo_workspace_id where a.id = \$1 and owner_user.identity_provider = ''demo'' and student_user.identity_provider = ''demo'' and w.status in (''resetting'', ''expired'') for update of w', TG_TABLE_SCHEMA, TG_TABLE_SCHEMA, TG_TABLE_SCHEMA, TG_TABLE_SCHEMA, TG_TABLE_SCHEMA)
        into permitted using OLD.assignment_id, OLD.student_id;       if permitted then return OLD; end if;     end;   end if;   raise exception 'Submitted attempts are immutable' using errcode = '23514'; end if; if TG_OP = 'DELETE' then return OLD; end if; return NEW; end; \$\$ language plpgsql;`);
    this.addSql(`create trigger "assignment_attempts_submitted_immutable" BEFORE UPDATE OR DELETE on "assignment_attempts" for each ROW execute function "assignment_attempts_assignment_attempts_submitted_immutable_fn"();`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop trigger if exists "assignment_attempts_submitted_immutable" on "assignment_attempts";`);
    this.addSql(`drop function if exists "assignment_attempts_assignment_attempts_submitted_immutable_fn"();`);
    this.addSql(`create or replace function "assignment_attempts_assignment_attempts_submitted_immutable_fn"() returns trigger as \$\$ begin if OLD.submitted_at is not null then raise exception 'Submitted attempts are immutable' using errcode = '23514'; end if; if TG_OP = 'DELETE' then return OLD; end if; return NEW; end; \$\$ language plpgsql;`);
    this.addSql(`create trigger "assignment_attempts_submitted_immutable" BEFORE UPDATE OR DELETE on "assignment_attempts" for each ROW execute function "assignment_attempts_assignment_attempts_submitted_immutable_fn"();`);

    this.addSql(`drop trigger if exists "problem_versions_immutable" on "problem_versions";`);
    this.addSql(`drop function if exists "problem_versions_problem_versions_immutable_fn"();`);
    this.addSql(`create or replace function "problem_versions_problem_versions_immutable_fn"() returns trigger as \$\$ begin raise exception 'Published problem versions are immutable' using errcode = '23514'; end; \$\$ language plpgsql;`);
    this.addSql(`create trigger "problem_versions_immutable" BEFORE UPDATE OR DELETE on "problem_versions" for each ROW execute function "problem_versions_problem_versions_immutable_fn"();`);
  }

}
