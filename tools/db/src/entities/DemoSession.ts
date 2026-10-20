import { Check, Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/decorators/es';
import { DemoWorkspace } from './DemoWorkspace.ts';
import type { UserRole } from '../types/user/enums.ts';
import type { DemoSessionFields } from '../types/demo-session/fields.ts';
import type { Assert, SameEntityFields } from '../types/shared/entity-fields.ts';

/** Hash-only demo credential, separate from Cognito sessions and fenced by reset generation. */
@Entity({ tableName: 'demo_sessions' })
@Check({ name: 'demo_sessions_hash_check', expression: "id ~ '^[0-9a-f]{64}$'" })
@Check({ name: 'demo_sessions_generation_check', expression: 'generation > 0' })
@Check({
  name: 'demo_sessions_role_check',
  expression: "selected_role in ('student', 'instructor')",
})
export class DemoSession implements DemoSessionFields {
  @PrimaryKey({ type: 'string', length: 64 })
  id!: string;

  @ManyToOne(() => DemoWorkspace, {
    fieldName: 'workspace_id',
    foreignKeyName: 'demo_sessions_workspace_id_fkey',
    deleteRule: 'cascade',
    index: true,
  })
  workspace!: DemoWorkspace;

  @Property({ type: 'integer' })
  generation!: number;

  @Property({ type: 'string', fieldName: 'selected_role', length: 16 })
  selectedRole!: UserRole;

  @Property({ type: 'datetime', fieldName: 'created_at', columnType: 'timestamptz' })
  createdAt!: Date;
}

type DemoSessionFieldsCheck = Assert<SameEntityFields<DemoSession, DemoSessionFields>>;
