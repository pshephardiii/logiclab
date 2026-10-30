import type { ProblemType } from '../src/types/problem/enums.ts';
import type { ProblemDefinition } from '../src/types/problem/definition.ts';
import type { OptionalProps } from '@mikro-orm/core';
import type { Assert, SameEntityFields } from '../src/types/shared/entity-fields.ts';
import type { Assignment } from '../src/entities/Assignment.ts';
import type { AssignmentFields } from '../src/types/assignment/fields.ts';

// These assertions run under tsc, not the runtime test runner. Each expected error
// must remain an error, or TypeScript rejects the unused @ts-expect-error directive.
type AssignmentMatches = Assert<SameEntityFields<Assignment, AssignmentFields>>;
type MetadataIsExcluded = Assert<
  SameEntityFields<{ id: string; [OptionalProps]?: 'id' }, { id: string }>
>;

type WithExtraField = SameEntityFields<Assignment & { extra: string }, AssignmentFields>;
// @ts-expect-error Entity-only fields must be added to the readable interface too.
type ExtraField = Assert<WithExtraField>;

type WithExtraOptionalField = SameEntityFields<Assignment & { extra?: string }, AssignmentFields>;
// @ts-expect-error Even extra optional fields count as drift.
type ExtraOptionalField = Assert<WithExtraOptionalField>;

type WithoutInstructions = SameEntityFields<Omit<Assignment, 'instructions'>, AssignmentFields>;
// @ts-expect-error Optional interface fields cannot silently disappear from the entity.
type MissingField = Assert<WithoutInstructions>;

type WithChangedTitle = SameEntityFields<
  Omit<Assignment, 'title'> & { title: number },
  AssignmentFields
>;
// @ts-expect-error A field's type must match exactly.
type ChangedType = Assert<WithChangedTitle>;

type WithRequiredInstructions = SameEntityFields<
  Omit<Assignment, 'instructions'> & { instructions: string | undefined },
  AssignmentFields
>;
// @ts-expect-error Required and optional properties are distinct, including required undefined unions.
type ChangedOptionality = Assert<WithRequiredInstructions>;

// Persisted problem kinds stay compatible with API string discriminants while
// rejecting unsupported kinds until their definition variant is implemented.
type DefinitionKind = ProblemDefinition['type'];
type SupportedEnumKind = Assert<ProblemType.TruthTable extends DefinitionKind ? true : false>;
type SupportedWireKind = Assert<'truth_table' extends DefinitionKind ? true : false>;
type StoredDerivationKind = Assert<'derivation' extends DefinitionKind ? true : false>;
// @ts-expect-error Adding an unsupported exercise kind must not bypass the definition model.
type UnsupportedKind = Assert<'predicate_derivation' extends DefinitionKind ? true : false>;
