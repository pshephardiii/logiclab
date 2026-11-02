import { Migration } from '@mikro-orm/migrations';

/** Add proof-result storage without rewriting retained objective results or awarded points. */
export class Migration20261102120000 extends Migration {
  override name = 'Migration20261102120000';
  override up(): void {
    this.addSql(`
      alter table "assignment_attempts"
        drop constraint "assignment_attempts_score_state_check",
        add constraint "assignment_attempts_score_state_check" check (
          score is null or coalesce(
            submitted_at is not null
            and result->>'gradingVersion' in ('truth_table_v1', 'mixed_v1', 'proof_mixed_v1')
            and jsonb_typeof(score) = 'object'
            and score->>'scoringVersion' = 'points_v1',
            false
          )
        ),
        add constraint "assignment_attempts_proof_score_required" check (
          result->>'gradingVersion' is distinct from 'proof_mixed_v1' or score is not null
        );
    `);
  }
  override down(): void {
    this.addSql('lock table "assignment_attempts" in access exclusive mode;');
    this.addSql(`
      do $$
      begin
        if exists (
          select 1
          from assignment_attempts
          where result->>'gradingVersion' = 'proof_mixed_v1'
        ) then
          raise exception 'Cannot roll back while retained proof results exist';
        end if;
      end $$;
    `);
    this.addSql(`
      alter table "assignment_attempts"
        drop constraint "assignment_attempts_proof_score_required",
        drop constraint "assignment_attempts_score_state_check",
        add constraint "assignment_attempts_score_state_check" check (
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
}
