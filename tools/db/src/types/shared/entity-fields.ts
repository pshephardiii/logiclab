import type { OptionalProps } from '@mikro-orm/core';

/** Exclude ORM creation metadata, while retaining all declared application members. */
type EntityFields<Entity> = Omit<Entity, typeof OptionalProps>;

/** Compare exact shapes, including optionality; mutual assignability alone permits extra fields. */
export type SameEntityFields<Entity, Fields> =
  (<T>() => T extends EntityFields<Entity> ? 1 : 2) extends <T>() => T extends Fields ? 1 : 2
    ? true
    : false;

export type Assert<Matches extends true> = Matches;
