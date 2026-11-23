import { chainContinuationSource } from './chain-continuation';
import { formulaChainMembers, requireExplicitGrouping } from '../parser/grouping';
import { FormulaParseError } from '../parser/errors';
import type { ParsedFormulaSyntax } from '../parser/syntax';
import { sameFormula } from '../proof/formula-equality';
import { parseTruthTreeFormulaWithSyntax } from './parse-formula';
import {
  TRUTH_TREE_LIMITS,
  TRUTH_TREE_CHAIN_RULE_CATALOG_VERSION,
  type TruthTreeChainChoice as Choice,
} from '@logiclab/contracts/truth-tree';
import { truthTreeBudget, TruthTreeResourceLimit, type TruthTreeBudget } from './structure-context';
import type { TruthTreeFormula } from './types';

export { TRUTH_TREE_CHAIN_RULE_CATALOG_VERSION };

export type TruthTreeChainExpansionInput = {
  readonly ruleCatalogVersion: typeof TRUTH_TREE_CHAIN_RULE_CATALOG_VERSION;
  /** Caller supplies the original pinned source or a previously derived authoritative source. */
  readonly source: string;
  readonly choice: Choice;
  /** One conjunct, or one formula on each of two ordered alternatives. */
  readonly results: readonly string[];
};

export type TruthTreeChainExpansionMatch =
  | {
      readonly status: 'matched';
      readonly ruleCatalogVersion: typeof TRUTH_TREE_CHAIN_RULE_CATALOG_VERSION;
      readonly ruleId: Choice['ruleId'];
      readonly memberCount: number;
      readonly coveredMemberIndices: readonly number[];
      /** Internal continuation data. Never expose this as student diagnostics or an answer key. */
      readonly derivedSources: readonly string[];
    }
  | {
      readonly status: 'mismatch' | 'unassessable';
      readonly reason:
        | 'unsupported_version'
        | 'invalid_input'
        | 'invalid_formula'
        | 'invalid_choice'
        | 'rule_mismatch'
        | 'resource_limit';
      readonly position?: number;
    };

type Syntax = ParsedFormulaSyntax<{ readonly type: 'bottom' }>;

function parsed(source: string, budget: TruthTreeBudget): Syntax {
  budget.spend(source.length + 1);
  const value = requireExplicitGrouping(parseTruthTreeFormulaWithSyntax(source));
  budget.spend(value.nodes.size);
  return value;
}

function memberText(parsed: Syntax, node: TruthTreeFormula): string {
  const location = parsed.nodes.get(node)!;
  const span = location.groups.at(-1) ?? location.span;
  return parsed.source.slice(span.start, span.end);
}

/**
 * Match one selected positive-chain expansion, not a whole tree or a grade. Member positions
 * belong to the authoritative source, so repeated conjuncts stay distinct. Derived source text
 * retains inherited boundaries even if the student writes an equivalent spelling without them.
 */
export function matchTruthTreeChainExpansion(
  input: TruthTreeChainExpansionInput,
  budget: TruthTreeBudget = truthTreeBudget(),
): TruthTreeChainExpansionMatch {
  if (input.ruleCatalogVersion !== TRUTH_TREE_CHAIN_RULE_CATALOG_VERSION)
    return { status: 'unassessable', reason: 'unsupported_version' };

  // This typed engine helper is not a raw HTTP reader; still bound all strings/results before parsing.
  if (
    typeof input.source !== 'string' ||
    input.source.length > TRUTH_TREE_LIMITS.maxFormulaLength ||
    !Array.isArray(input.results) ||
    input.results.length > 2 ||
    input.results.some(
      (text) => typeof text !== 'string' || text.length > TRUTH_TREE_LIMITS.maxFormulaLength,
    )
  )
    return { status: 'unassessable', reason: 'invalid_input' };

  let parsingAuthoritative = true;
  try {
    const source = parsed(input.source, budget);
    const operator = input.choice.ruleId === 'conjunct_extraction' ? 'and' : 'or';
    if (source.formula.type !== 'binary' || source.formula.operator !== operator)
      return { status: 'mismatch', reason: 'rule_mismatch' };

    const members = formulaChainMembers(source);
    const choice = input.choice;
    let groups: readonly TruthTreeFormula[][];
    let coveredMemberIndices: number[];

    if (choice.ruleId === 'conjunct_extraction') {
      if (
        !Number.isInteger(choice.memberIndex) ||
        choice.memberIndex < 0 ||
        choice.memberIndex >= members.length
      )
        return { status: 'mismatch', reason: 'invalid_choice' };
      groups = [[members[choice.memberIndex]!]];
      coveredMemberIndices = [choice.memberIndex];
    } else if (choice.ruleId === 'disjunction') {
      if (
        !Number.isInteger(choice.splitIndex) ||
        choice.splitIndex < 1 ||
        choice.splitIndex >= members.length
      )
        return { status: 'mismatch', reason: 'invalid_choice' };
      groups = [members.slice(0, choice.splitIndex), members.slice(choice.splitIndex)];
      coveredMemberIndices = members.map((_, index) => index);
    } else return { status: 'mismatch', reason: 'invalid_choice' };

    if (input.results.length !== groups.length)
      return { status: 'mismatch', reason: 'rule_mismatch' };

    // Rebuild each continuation from the pinned members, not from the student's result text.
    // No extra spaces are inserted: compact source at the formula limit must remain representable.
    const expectedSources = groups.map((group) =>
      group.map((node) => memberText(source, node)).join('∨'),
    );
    const derivedSources: string[] = [];
    for (const [index, text] of expectedSources.entries()) {
      parsingAuthoritative = true;
      const expected = parsed(text, budget);
      parsingAuthoritative = false;
      const actual = parsed(input.results[index]!, budget);
      budget.spend(expected.nodes.size + actual.nodes.size);
      if (!sameFormula(expected.formula, actual.formula))
        return { status: 'mismatch', reason: 'rule_mismatch' };
      derivedSources.push(chainContinuationSource(expected, actual, budget));
    }

    return {
      status: 'matched',
      ruleCatalogVersion: TRUTH_TREE_CHAIN_RULE_CATALOG_VERSION,
      ruleId: choice.ruleId,
      memberCount: members.length,
      coveredMemberIndices,
      derivedSources,
    };
  } catch (error) {
    if (error instanceof FormulaParseError)
      return {
        status: parsingAuthoritative ? 'unassessable' : 'mismatch',
        reason: 'invalid_formula',
        position: error.position,
      };
    if (error instanceof TruthTreeResourceLimit)
      return { status: 'unassessable', reason: 'resource_limit' };
    throw error;
  }
}
