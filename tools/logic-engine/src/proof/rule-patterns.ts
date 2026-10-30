import type { BinaryOperator } from '../parser/types';
import { sameFormula } from './formula-equality';
import type { PropositionalRuleId } from './rule-catalog';
import type { ProofFormula, LocalSubproof } from './types';

type BinaryFormula = Extract<ProofFormula, { type: 'binary' }>;
function binary(formula: ProofFormula, operator: BinaryOperator): formula is BinaryFormula {
  return formula.type === 'binary' && formula.operator === operator;
}
function negates(negative: ProofFormula, positive: ProofFormula): boolean {
  return negative.type === 'not' && sameFormula(negative.operand, positive);
}
function eitherOrder<T>(values: readonly T[], match: (first: T, second: T) => boolean): boolean {
  return match(values[0]!, values[1]!) || match(values[1]!, values[0]!);
}
function operands(formula: BinaryFormula, left: ProofFormula, right: ProofFormula): boolean {
  return sameFormula(formula.left, left) && sameFormula(formula.right, right);
}

type RulePattern = (
  conclusion: ProofFormula,
  lines: readonly ProofFormula[],
  subproofs: readonly LocalSubproof[],
) => boolean;

/** Exact catalog variants; callers must first enforce the catalog's reference counts. */
const patterns: Record<PropositionalRuleId, RulePattern> = {
  reiteration: (conclusion, lines) => sameFormula(conclusion, lines[0]!),
  and_introduction: (conclusion, lines) =>
    binary(conclusion, 'and') && eitherOrder(lines, (a, b) => operands(conclusion, a, b)),
  and_elimination: (conclusion, lines) => {
    const conjunction = lines[0]!;
    return (
      binary(conjunction, 'and') &&
      (sameFormula(conclusion, conjunction.left) || sameFormula(conclusion, conjunction.right))
    );
  },
  or_introduction: (conclusion, lines) =>
    binary(conclusion, 'or') &&
    (sameFormula(lines[0]!, conclusion.left) || sameFormula(lines[0]!, conclusion.right)),
  or_elimination: (conclusion, lines, subproofs) => {
    const disjunction = lines[0]!;
    return (
      binary(disjunction, 'or') &&
      subproofs.every((subproof) => sameFormula(subproof.conclusion, conclusion)) &&
      eitherOrder(subproofs, (a, b) => operands(disjunction, a.assumption, b.assumption))
    );
  },
  implication_introduction: (conclusion, _lines, subproofs) =>
    binary(conclusion, 'implies') &&
    operands(conclusion, subproofs[0]!.assumption, subproofs[0]!.conclusion),
  implication_elimination: (conclusion, lines) =>
    eitherOrder(
      lines,
      (conditional, antecedent) =>
        binary(conditional, 'implies') && operands(conditional, antecedent, conclusion),
    ),
  negation_introduction: (conclusion, _lines, subproofs) =>
    negates(conclusion, subproofs[0]!.assumption) && subproofs[0]!.conclusion.type === 'bottom',
  contradiction_introduction: (conclusion, lines) =>
    conclusion.type === 'bottom' && eitherOrder(lines, (a, notA) => negates(notA, a)),
  contradiction_elimination: (_conclusion, lines) => lines[0]!.type === 'bottom',
  biconditional_introduction: (conclusion, lines) =>
    binary(conclusion, 'iff') &&
    eitherOrder(
      lines,
      (forward, reverse) =>
        binary(forward, 'implies') &&
        binary(reverse, 'implies') &&
        operands(forward, conclusion.left, conclusion.right) &&
        operands(reverse, conclusion.right, conclusion.left),
    ),
  biconditional_elimination: (conclusion, lines) => {
    const biconditional = lines[0]!;
    return (
      binary(biconditional, 'iff') &&
      binary(conclusion, 'implies') &&
      (operands(conclusion, biconditional.left, biconditional.right) ||
        operands(conclusion, biconditional.right, biconditional.left))
    );
  },
  double_negation_introduction: (conclusion, lines) =>
    conclusion.type === 'not' && negates(conclusion.operand, lines[0]!),
  modus_tollens: (conclusion, lines) =>
    eitherOrder(
      lines,
      (conditional, notConsequent) =>
        binary(conditional, 'implies') &&
        negates(notConsequent, conditional.right) &&
        negates(conclusion, conditional.left),
    ),
  disjunctive_syllogism: (conclusion, lines) =>
    eitherOrder(
      lines,
      (disjunction, negative) =>
        binary(disjunction, 'or') &&
        ((negates(negative, disjunction.left) && sameFormula(conclusion, disjunction.right)) ||
          (negates(negative, disjunction.right) && sameFormula(conclusion, disjunction.left))),
    ),
  hypothetical_syllogism: (conclusion, lines) =>
    eitherOrder(
      lines,
      (first, second) =>
        binary(first, 'implies') &&
        binary(second, 'implies') &&
        binary(conclusion, 'implies') &&
        sameFormula(first.right, second.left) &&
        operands(conclusion, first.left, second.right),
    ),
  double_negation_elimination: (conclusion, lines) => {
    const negative = lines[0]!;
    return negative.type === 'not' && negates(negative.operand, conclusion);
  },
  proof_by_contradiction: (conclusion, _lines, subproofs) =>
    negates(subproofs[0]!.assumption, conclusion) && subproofs[0]!.conclusion.type === 'bottom',
  excluded_middle: (conclusion) =>
    binary(conclusion, 'or') && negates(conclusion.right, conclusion.left),
};

export function matchesRule(
  rule: PropositionalRuleId,
  conclusion: ProofFormula,
  lines: readonly ProofFormula[],
  subproofs: readonly LocalSubproof[],
): boolean {
  return patterns[rule](conclusion, lines, subproofs);
}
