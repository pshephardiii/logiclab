/** Delete-only exceptions for disposable demo data; updates remain immutable in every state. */
export const problemVersionRetentionBody = `
if TG_OP = 'DELETE' then
  declare permitted boolean := false;
  begin
    execute format('select true from %I.problems p join %I.users u on u.id = p.owner_id join %I.demo_workspaces w on w.id = u.demo_workspace_id where p.id = $1 and u.identity_provider = ''demo'' and w.status in (''resetting'', ''expired'') for update of w', TG_TABLE_SCHEMA, TG_TABLE_SCHEMA, TG_TABLE_SCHEMA)
      into permitted using OLD.problem_id;
    if permitted then return OLD; end if;
  end;
end if;
raise exception 'Published problem versions are immutable' using errcode = '23514';`;

export const submittedAttemptRetentionBody = `
if OLD.submitted_at is not null then
  if TG_OP = 'DELETE' then
    declare permitted boolean := false;
    begin
      execute format('select true from %I.assignments a join %I.classrooms c on c.id = a.classroom_id join %I.users owner_user on owner_user.id = c.owner_id join %I.users student_user on student_user.id = $2 join %I.demo_workspaces w on w.id = owner_user.demo_workspace_id and w.id = student_user.demo_workspace_id where a.id = $1 and owner_user.identity_provider = ''demo'' and student_user.identity_provider = ''demo'' and w.status in (''resetting'', ''expired'') for update of w', TG_TABLE_SCHEMA, TG_TABLE_SCHEMA, TG_TABLE_SCHEMA, TG_TABLE_SCHEMA, TG_TABLE_SCHEMA)
        into permitted using OLD.assignment_id, OLD.student_id;
      if permitted then return OLD; end if;
    end;
  end if;
  raise exception 'Submitted attempts are immutable' using errcode = '23514';
end if;
if TG_OP = 'DELETE' then return OLD; end if;
return NEW;`;
