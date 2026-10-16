import { BillingProvider } from '../types/billing/enums.ts';
import { randomUUID } from 'node:crypto';
import { OptionalProps } from '@mikro-orm/core';
import { Entity, Index, Check, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/es';
import type { PaymentEventFields } from '../types/payment-event/fields.ts';
import type { Assert, SameEntityFields } from '../types/shared/entity-fields.ts';

/** Receipt inserted atomically with event effects; failed transactions must leave no receipt. */
@Entity({ tableName: 'payment_events' })
@Check({ name: 'payment_events_provider_check', expression: "provider in ('simulator')" })
@Unique({ name: 'payment_events_provider_event_unique', properties: ['provider', 'eventId'] })
@Index({ name: 'payment_events_source_index', properties: ['provider', 'sourceReference'] })
@Check({ name: 'payment_events_sequence_check', expression: 'sequence > 0' })
@Check({ name: 'payment_events_hash_check', expression: "payload_hash ~ '^[0-9a-f]{64}$'" })
export class PaymentEvent implements PaymentEventFields {
  [OptionalProps]?: 'id' | 'processedAt';

  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()', onCreate: () => randomUUID() })
  id: string = randomUUID();

  @Property({ type: 'string', fieldName: 'provider', length: 32 })
  provider!: BillingProvider;

  @Property({ type: 'string', fieldName: 'event_id', length: 255 })
  eventId!: string;

  @Property({ type: 'string', fieldName: 'source_reference', length: 255 })
  sourceReference!: string;

  @Property({ type: 'integer', fieldName: 'sequence' })
  sequence!: number;

  @Property({ type: 'string', fieldName: 'payload_hash', length: 64 })
  payloadHash!: string;

  @Property({
    type: 'datetime',
    fieldName: 'processed_at',
    columnType: 'timestamptz',
    defaultRaw: 'now()',
    onCreate: () => new Date(),
  })
  processedAt: Date = new Date();
}

type PaymentEventFieldsCheck = Assert<SameEntityFields<PaymentEvent, PaymentEventFields>>;
