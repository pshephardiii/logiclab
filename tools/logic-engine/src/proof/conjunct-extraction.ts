import { FORMULA_GROUPING_POLICY_VERSION } from '@logiclab/contracts/formula-policy-values';
import { formulaChainMembers, requireExplicitGrouping } from '../parser/grouping';
import { FormulaParseError } from '../parser/errors';
import { mergeFormulaGrouping } from '../formula/grouping-source';
import { sameFormula } from './formula-equality';
import { parseProofFormulaWithSyntax, PROOF_FORMULA_LIMITS } from './parse-formula';
import { proofBudget, ProofBudgetExceeded, type ProofBudget } from './proof-budget';
import {
  PROPOSITIONAL_CHAIN_RULE_CATALOG_VERSION,
  PROPOSITIONAL_CONJUNCT_EXTRACTION_RULE,
} from './rule-catalog';

export type ProofConjunctExtractionInput = {
  readonly ruleCatalogVersion: typeof PROPOSITIONAL_CHAIN_RULE_CATALOG_VERSION;
  readonly formulaGroupingVersion: typeof FORMULA_GROUPING_POLICY_VERSION;
  /** Original pinned formula or a previously derived authoritative continuation. */
  readonly source: string;
  readonly memberIndex: number;
  readonly conclusion: string;
};

export type ProofConjunctExtractionMatch =
  | {
      readonly status: 'matched';
      readonly ruleCatalogVersion: typeof PROPOSITIONAL_CHAIN_RULE_CATALOG_VERSION;
      readonly ruleId: typeof PROPOSITIONAL_CONJUNCT_EXTRACTION_RULE.id;
      readonly memberIndex: number;
      readonly memberCount: number;
      /** Internal provenance, not feedback or a reference answer. Retains inherited/entered groups. */
      readonly derivedSource: string;
    }
  | {
      readonly status: 'mismatch' | 'unassessable';
      readonly reason:
        | 'unsupported_version'
        | 'invalid_input'
        | 'invalid_source'
        | 'invalid_conclusion'
        | 'invalid_choice'
        | 'rule_mismatch'
        | 'resource_limit';
      readonly position?: number;
    };

/**
 * Source-aware matching only. The full caller must separately authorize this rule, resolve a
 * visible supporting line and propagate its support/dependencies; a match is never a proof grade.
 */
export function matchProofConjunctExtraction(
  input: ProofConjunctExtractionInput,
  budget: ProofBudget = proofBudget(),
): ProofConjunctExtractionMatch {
  if (!input || typeof input !== 'object')
    return { status: 'unassessable', reason: 'invalid_input' };
  if (
    input.ruleCatalogVersion !== PROPOSITIONAL_CHAIN_RULE_CATALOG_VERSION ||
    input.formulaGroupingVersion !== FORMULA_GROUPING_POLICY_VERSION
  )
    return { status: 'unassessable', reason: 'unsupported_version' };

  if (typeof input.source !== 'string' || typeof input.conclusion !== 'string')
    return { status: 'unassessable', reason: 'invalid_input' };

  let parsingSource = true;
  try {
    const parse = (text: string) => {
      // Bound before charging/traversing caller-controlled text, including compact long chains.
      if (text.length > PROOF_FORMULA_LIMITS.maxLength)
        throw new ProofBudgetExceeded('Formula exceeds the proof formula limit.');
      budget.spend(text.length + 1);
      const syntax = requireExplicitGrouping(parseProofFormulaWithSyntax(text));
      budget.spend(syntax.nodes.size);
      return syntax;
    };
    const source = parse(input.source);
    if (source.formula.type !== 'binary' || source.formula.operator !== 'and')
      return { status: 'mismatch', reason: 'rule_mismatch' };

    budget.spend(source.nodes.size);
    const members = formulaChainMembers(source);
    if (
      !Number.isInteger(input.memberIndex) ||
      input.memberIndex < 0 ||
      input.memberIndex >= members.length
    )
      return { status: 'mismatch', reason: 'invalid_choice' };

    // A grouped member can be extracted whole; its interior only becomes available on a later line.
    const member = members[input.memberIndex]!;
    const location = source.nodes.get(member)!;
    const span = location.groups.at(-1) ?? location.span;
    const expected = parse(source.source.slice(span.start, span.end));
    parsingSource = false;
    const entered = parse(input.conclusion);
    budget.spend(expected.nodes.size + entered.nodes.size);
    if (!sameFormula(expected.formula, entered.formula))
      return { status: 'mismatch', reason: 'rule_mismatch' };

    const derivedSource = mergeFormulaGrouping(
      expected,
      entered,
      budget,
      PROOF_FORMULA_LIMITS.maxLength,
    );
    // Merged inherited and student-added groups must remain representable within proof limits.
    parse(derivedSource);
    return {
      status: 'matched',
      ruleCatalogVersion: PROPOSITIONAL_CHAIN_RULE_CATALOG_VERSION,
      ruleId: PROPOSITIONAL_CONJUNCT_EXTRACTION_RULE.id,
      memberIndex: input.memberIndex,
      memberCount: members.length,
      derivedSource,
    };
  } catch (error) {
    if (error instanceof ProofBudgetExceeded)
      return { status: 'unassessable', reason: 'resource_limit' };
    if (!(error instanceof FormulaParseError)) throw error;
    const limited =
      error.code === 'FORMULA_TOO_LONG' ||
      error.code === 'NESTING_LIMIT' ||
      error.code === 'VARIABLE_LIMIT';
    return {
      status: limited || parsingSource ? 'unassessable' : 'mismatch',
      reason: limited ? 'resource_limit' : parsingSource ? 'invalid_source' : 'invalid_conclusion',
      position: error.position,
    };
  }
}
