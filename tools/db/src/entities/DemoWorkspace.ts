import { randomUUID } from 'node:crypto';
import { OptionalProps } from '@mikro-orm/core';
import { Check, Entity, Index, PrimaryKey, Property } from '@mikro-orm/decorators/es';
import type { DemoWorkspaceFields } from '../types/demo-workspace/fields.ts';
import { DemoWorkspaceStatus } from '../types/demo-workspace/enums.ts';
import type { Assert, SameEntityFields } from '../types/shared/entity-fields.ts';

/** Explicit root for disposable demo data; expiration is independent of cleanup timing. */
@Entity({ tableName: 'demo_workspaces' })
@Index({ name: 'demo_workspaces_idle_expiry_index', properties: ['idleExpiresAt', 'id'] })
@Index({ name: 'demo_workspaces_expiry_index', properties: ['expiresAt', 'id'] })
@Check({
  name: 'demo_workspaces_status_check',
  expression: "status in ('provisioning', 'active', 'resetting', 'expired')",
})
@Check({
  name: 'demo_workspaces_version_check',
  expression: 'template_version > 0 and generation > 0',
})
@Check({
  name: 'demo_workspaces_lifetime_check',
  expression: `
      created_at <= last_activity_at
        and last_activity_at < idle_expires_at
        and idle_expires_at <= expires_at
    `,
})
export class DemoWorkspace implements DemoWorkspaceFields {
  [OptionalProps]?: 'id' | 'status' | 'generation';

  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()', onCreate: () => randomUUID() })
  id: string = randomUUID();

  @Property({ type: 'string', length: 32, default: DemoWorkspaceStatus.Provisioning })
  status: DemoWorkspaceStatus = DemoWorkspaceStatus.Provisioning;

  @Property({ type: 'integer', fieldName: 'template_version' })
  templateVersion!: number;

  @Property({ type: 'integer', default: 1 })
  generation: number = 1;

  @Property({ type: 'datetime', columnType: 'timestamptz', fieldName: 'created_at' })
  createdAt!: Date;

  @Property({ type: 'datetime', columnType: 'timestamptz', fieldName: 'last_activity_at' })
  lastActivityAt!: Date;

  @Property({ type: 'datetime', columnType: 'timestamptz', fieldName: 'idle_expires_at' })
  idleExpiresAt!: Date;

  @Property({ type: 'datetime', columnType: 'timestamptz', fieldName: 'expires_at' })
  expiresAt!: Date;
}

type DemoWorkspaceFieldsCheck = Assert<SameEntityFields<DemoWorkspace, DemoWorkspaceFields>>;
