import { Migration } from '@mikro-orm/migrations';

/** Independent retained grading history; original submissions are never updated. */
export class Migration20261103120000 extends Migration {
  override name = 'Migration20261103120000';

  override up(): void {
    this.addSql(`
      create table "submission_grading_revisions" (
        "id" uuid not null default gen_random_uuid(),
        "attempt_id" uuid not null,
        "revision" integer not null,
        "reviewer_id" uuid not null,
        "changes" jsonb not null,
        "grading" jsonb not null,
        "score" jsonb not null,
        "created_at" timestamptz not null default now(),
        primary key ("id"),
        constraint "submission_grading_revisions_attempt_revision_unique" unique ("attempt_id", "revision"),
        constraint "submission_grading_revisions_attempt_id_fkey" foreign key ("attempt_id") references "assignment_attempts" ("id") on delete restrict,
        constraint "submission_grading_revisions_reviewer_id_fkey" foreign key ("reviewer_id") references "users" ("id") on delete restrict,
        constraint "submission_grading_revisions_revision_check" check (revision >= 1),
        constraint "submission_grading_revisions_state_check" check (coalesce(
    jsonb_typeof(grading) = 'object'
    and grading->>'gradingVersion' = 'instructor_grading_v1'
    and grading->'revision' = to_jsonb(revision)
    and jsonb_typeof(grading->'items') = 'array'
    and jsonb_array_length(grading->'items') >= 1 and jsonb_array_length(grading->'items') <= 50
    and jsonb_typeof(changes) = 'array'
    and jsonb_array_length(changes) >= 1 and jsonb_array_length(changes) <= 50
    and jsonb_typeof(score) = 'object'
    and score->>'scoringVersion' = 'points_v1', false
  ))
      );
    `);
    this.addSql(`
      create or replace function "submission_grading_revisions_grading_immutable_fn"()
      returns trigger as $$
      begin
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
raise exception 'Grading history is immutable' using errcode = '23514';
      end;
      $$ language plpgsql;
    `);
    this.addSql(`
      create trigger "grading_immutable"
      before update or delete on "submission_grading_revisions"
      for each row execute function "submission_grading_revisions_grading_immutable_fn"();
    `);
    this.addSql(`
      create or replace function "submission_grading_revisions_grading_insert_fn"()
      returns trigger as $$
      begin
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
end;
      end;
      $$ language plpgsql;
    `);
    this.addSql(`
      create trigger "grading_insert"
      before insert on "submission_grading_revisions"
      for each row execute function "submission_grading_revisions_grading_insert_fn"();
    `);
  }

  override down(): void {
    this.addSql('lock table "submission_grading_revisions" in access exclusive mode;');
    this.addSql(`
      do $$
      begin
        if exists (select 1 from submission_grading_revisions) then
          raise exception 'Cannot roll back while retained instructor grading exists';
        end if;
      end $$;
    `);
    this.addSql('drop trigger "grading_immutable" on "submission_grading_revisions";');
    this.addSql('drop function "submission_grading_revisions_grading_immutable_fn"();');
    this.addSql('drop trigger "grading_insert" on "submission_grading_revisions";');
    this.addSql('drop function "submission_grading_revisions_grading_insert_fn"();');
    this.addSql('drop table "submission_grading_revisions";');
  }
}
