/** Serialized append-only final grading; JSON contents are validated by the application. */
export const gradingInsertBody = `
declare eligible boolean := false;
previous_revision integer;
begin
  execute format(
    'select true
     from %I.assignment_attempts attempt
     join %I.assignments assignment on assignment.id = attempt.assignment_id
     join %I.classrooms classroom on classroom.id = assignment.classroom_id
     join %I.users reviewer on reviewer.id = $2
     where attempt.id = $1
       and attempt.submitted_at is not null
       and attempt.score is not null
       and attempt.result->>''gradingVersion'' in (''truth_table_v1'', ''mixed_v1'', ''proof_mixed_v1'')
       and assignment.assessment_mode = ''graded''
       and assignment.published_at is not null
       and assignment.archived_at is null
       and classroom.owner_id = reviewer.id
       and reviewer.role = ''instructor''
     for update of attempt',
    TG_TABLE_SCHEMA, TG_TABLE_SCHEMA, TG_TABLE_SCHEMA, TG_TABLE_SCHEMA
  ) into eligible using NEW.attempt_id, NEW.reviewer_id;
  if not coalesce(eligible, false) then
    raise exception 'Grading requires an owned active final graded submission' using errcode = '23514';
  end if;
  execute format(
    'select coalesce(max(revision), 0) from %I.submission_grading_revisions where attempt_id = $1',
    TG_TABLE_SCHEMA
  ) into previous_revision using NEW.attempt_id;
  if NEW.revision::bigint <> previous_revision::bigint + 1 then
    raise exception 'Grading revisions must be appended in order' using errcode = '23514';
  end if;
  return NEW;
end;`;

/** Updates are never allowed; deletion is restricted to same-workspace demo reset/expiry. */
export const gradingRetentionBody = `
if TG_OP = 'DELETE' then
  declare permitted boolean := false;
  begin
    execute format(
      'select true
       from %I.assignment_attempts attempt
       join %I.assignments assignment on assignment.id = attempt.assignment_id
       join %I.classrooms classroom on classroom.id = assignment.classroom_id
       join %I.users owner_user on owner_user.id = classroom.owner_id
       join %I.users student_user on student_user.id = attempt.student_id
       join %I.users reviewer on reviewer.id = $2
       join %I.demo_workspaces workspace on workspace.id = owner_user.demo_workspace_id
        and workspace.id = student_user.demo_workspace_id
        and workspace.id = reviewer.demo_workspace_id
       where attempt.id = $1
         and owner_user.identity_provider = ''demo''
         and student_user.identity_provider = ''demo''
         and reviewer.identity_provider = ''demo''
         and workspace.status in (''resetting'', ''expired'')
       for update of workspace',
      TG_TABLE_SCHEMA, TG_TABLE_SCHEMA, TG_TABLE_SCHEMA, TG_TABLE_SCHEMA,
      TG_TABLE_SCHEMA, TG_TABLE_SCHEMA, TG_TABLE_SCHEMA
    ) into permitted using OLD.attempt_id, OLD.reviewer_id;
    if permitted then return OLD; end if;
  end;
end if;
raise exception 'Grading history is immutable' using errcode = '23514';`;
