import {
  getPropositionalRule,
  PROOF_CHECKER_VERSION,
  PROPOSITIONAL_RULE_CATALOG_VERSION,
} from '@logiclab/logic-engine/proof';
import { DerivationAuthoringError } from './errors';

/** Call after format-specific schema validation; labels never select or define inference behavior. */
export function assertDerivationConfiguration(value: {
  checkerVersion: number;
  ruleCatalogVersion: number;
  rules: readonly { id: string }[];
}) {
  if (
    value.checkerVersion !== PROOF_CHECKER_VERSION ||
    value.ruleCatalogVersion !== PROPOSITIONAL_RULE_CATALOG_VERSION
  )
    throw new DerivationAuthoringError('invalid_definition');
  if (value.rules.some((rule) => !getPropositionalRule(rule.id)))
    throw new DerivationAuthoringError('unknown_rule');
}
