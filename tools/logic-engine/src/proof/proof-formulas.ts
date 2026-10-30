import type { ProofCheckInput } from '@logiclab/contracts';
import { FormulaParseError } from '../parser/errors';
import { getPropositionalRule } from './rule-catalog';
import { parseProofFormula } from './parse-formula';
import { ProofBudgetExceeded, type ProofBudget } from './proof-budget';
import type { StructureDiagnostics } from './structure-diagnostics';
import type { ProofFormula } from './types';

export type ParsedProofFormula =
  | { formula: ProofFormula; size: number; status: 'valid' }
  | { formula: null; size: 0; status: 'invalid' | 'unassessable' };

export function readFormula(
  source: string,
  budget: ProofBudget,
  diagnostics: StructureDiagnostics,
  stepIndex?: number,
): ParsedProofFormula {
  budget.spend(source.length + 1);
  if (!source.trim()) {
    diagnostics.add({
      code: 'INCOMPLETE_PROOF',
      message: 'Formula is blank.',
      ...(stepIndex === undefined ? {} : { stepIndex }),
    });
    return { formula: null, size: 0, status: 'unassessable' };
  }
  try {
    const formula = parseProofFormula(source);
    const pending = [formula];
    let size = 0;
    while (pending.length) {
      budget.spend(1);
      size++;
      const node = pending.pop()!;
      if (node.type === 'not') pending.push(node.operand);
      else if (node.type === 'binary') pending.push(node.left, node.right);
    }
    return { formula, size, status: 'valid' };
  } catch (error) {
    if (!(error instanceof FormulaParseError)) throw error;
    if (
      error.code === 'FORMULA_TOO_LONG' ||
      error.code === 'NESTING_LIMIT' ||
      error.code === 'VARIABLE_LIMIT'
    )
      throw new ProofBudgetExceeded(error.message, error.position, stepIndex);
    diagnostics.add({
      code: 'INVALID_FORMULA',
      message: error.message,
      position: error.position,
      ...(stepIndex === undefined ? {} : { stepIndex }),
    });
    return { formula: null, size: 0, status: 'invalid' };
  }
}

export function readProblem(
  input: ProofCheckInput,
  budget: ProofBudget,
  diagnostics: StructureDiagnostics,
) {
  const premises = new Map<string, ParsedProofFormula>();
  for (const premise of input.problem.premises) {
    if (premises.has(premise.id))
      diagnostics.add({
        code: 'INVALID_STRUCTURE',
        message: 'Problem premise IDs must be unique.',
      });
    premises.set(premise.id, readFormula(premise.formula, budget, diagnostics));
  }
  const rules = new Set<string>();
  for (const rule of input.problem.permittedRuleIds) {
    if (rules.has(rule))
      diagnostics.add({ code: 'INVALID_STRUCTURE', message: 'Permitted rule IDs must be unique.' });
    if (!getPropositionalRule(rule))
      diagnostics.add({
        code: 'UNKNOWN_RULE',
        message: 'Problem permits an unsupported rule identity.',
      });
    rules.add(rule);
  }
  const conclusion = readFormula(input.problem.conclusion, budget, diagnostics);
  return { premises, conclusion };
}
