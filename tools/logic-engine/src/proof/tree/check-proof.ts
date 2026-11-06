import type { ProofCheckReport } from '@logiclab/contracts';
import { readTreeInput } from './input';
import { analyzeTreeStructure } from './structure';
import { evaluateTreeNodes } from './nodes';
import { readProblem, readFormula } from '../proof-formulas';
import { proofBudget, ProofBudgetExceeded } from '../proof-budget';
import { structureDiagnostics } from '../structure-diagnostics';
import { finishProofReport } from '../report';
import { sameFormula } from '../formula-equality';

/** Standalone checker; callers supply authoritative statements and enforce workflow/disclosure rules. */
export function checkTreeProof(value: unknown): ProofCheckReport {
  const diagnostics = structureDiagnostics();

  const finish = (
    status: ProofCheckReport['status'],
    target: ProofCheckReport['target'] = 'unknown',
    steps: ProofCheckReport['steps'] = [],
  ) => finishProofReport(diagnostics, status, target, steps);

  // Shape/version failures make the input unassessable, rather than an incorrect proof.
  const read = readTreeInput(value);

  if ('diagnostic' in read) {
    diagnostics.add(read.diagnostic);
    return finish('unassessable');
  }

  const { input } = read;
  const budget = proofBudget();

  try {
    // Validate the authoritative statement first; configuration errors are not student mistakes.
    const problem = readProblem(input, budget, diagnostics);

    if (diagnostics.items.length) return finish('unassessable');

    // Resolve structure before following citations or evaluating formulas through them.
    const structure = analyzeTreeStructure(input.proof, budget);

    structure.diagnostics.forEach((diagnostic) => diagnostics.add(diagnostic));

    if (structure.status !== 'resolved')
      return finish(
        structure.status === 'unassessable' ? 'unassessable' : 'needs_review',
        'unknown',
        structure.status === 'unassessable'
          ? []
          : input.proof.nodes.map((node, stepIndex) => ({
              stepId: node.id,
              stepIndex,
              localStatus: 'unassessable',
              dependencyStatus: 'unknown',
            })),
      );

    // Read every submitted formula, including branch assumptions, before propagating support.
    const formulas = input.proof.nodes.map((node, index) =>
      readFormula(node.formula, budget, diagnostics, index),
    );

    const branchFormulas = input.proof.nodes.map((node, index) =>
      node.kind === 'inference'
        ? node.branches.map((branch) =>
            readFormula(branch.assumptionFormula, budget, diagnostics, index),
          )
        : [],
    );

    const { reports, openAssumptions } = evaluateTreeNodes(
      input,
      structure,
      formulas,
      branchFormulas,
      problem.premises,
      budget,
      diagnostics,
    );

    // Matching target text is insufficient: its root must also have valid, closed support.
    const root = reports[structure.rootIndex]!;
    const formula = formulas[structure.rootIndex]!;
    let target: ProofCheckReport['target'] = 'not_established';

    if (!formula.formula) target = 'unknown';
    else {
      budget.spend(2 * (formula.size + problem.conclusion.size));

      if (sameFormula(formula.formula, problem.conclusion.formula!)) {
        target =
          root.localStatus === 'invalid' ||
          root.dependencyStatus === 'invalid' ||
          openAssumptions[structure.rootIndex]!.size > 0
            ? 'not_established'
            : root.localStatus === 'unassessable' || root.dependencyStatus === 'unknown'
              ? 'unknown'
              : 'established';
      }
    }

    if (target !== 'established')
      diagnostics.add({
        code: 'TARGET_NOT_ESTABLISHED',
        message:
          'The root must establish the requested conclusion with no open temporary assumptions.',
      });

    // Automatic acceptance requires an error-free submission, not just a matching conclusion.
    const accepted =
      target === 'established' &&
      diagnostics.items.length === 0 &&
      reports.every((node) => node.localStatus === 'valid' && node.dependencyStatus === 'valid');

    return finish(accepted ? 'accepted' : 'needs_review', target, reports);
  } catch (error) {
    if (!(error instanceof ProofBudgetExceeded)) throw error;

    diagnostics.add({
      code: 'RESOURCE_LIMIT',
      message: error.message,
      ...(error.position === undefined ? {} : { position: error.position }),
      ...(error.stepIndex === undefined ? {} : { stepIndex: error.stepIndex }),
    });
    return finish('unassessable');
  }
}
