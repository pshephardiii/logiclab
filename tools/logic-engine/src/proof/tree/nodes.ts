import type { TreeProofCheckInput, ProofCheckReport } from '@logiclab/contracts';
import type { TreeStructureResult } from './structure';
import type { ParsedProofFormula } from '../proof-formulas';
import type { ProofBudget } from '../proof-budget';
import type { StructureDiagnostics } from '../structure-diagnostics';
import { sameFormula } from '../formula-equality';
import { checkParsedRule } from '../parsed-rule';

type NodeReport = ProofCheckReport['steps'][number];
type Structure = Extract<TreeStructureResult, { status: 'resolved' }>;

/** Evaluate children before parents while retaining report positions in the submitted node array. */
export function evaluateTreeNodes(
  input: TreeProofCheckInput,
  structure: Structure,
  formulas: ParsedProofFormula[],
  branchFormulas: ParsedProofFormula[][],
  premises: Map<string, ParsedProofFormula>,
  budget: ProofBudget,
  diagnostics: StructureDiagnostics,
) {
  const reports: NodeReport[] = new Array(input.proof.nodes.length);
  const openAssumptions: Set<number>[] = new Array(input.proof.nodes.length);
  // Children already have reports/support, even when their array positions follow the parent.
  for (const index of structure.postorder) {
    const node = input.proof.nodes[index]!;
    const current = formulas[index]!;
    const reference = structure.references[index]!;
    const support = new Set<number>();
    let dependencyStatus: NodeReport['dependencyStatus'] = 'valid';
    let localStatus: NodeReport['localStatus'] = current.status;
    // Track assumption occurrences by identity, not formula: equal formulas can have different scopes.
    if (node.kind === 'assumption') support.add(index);
    if (node.kind === 'premise' && current.formula) {
      // A student's premise label cannot substitute a different formula for the pinned premise.
      const premise = node.premiseId === null ? undefined : premises.get(node.premiseId);
      if (node.premiseId === null) {
        localStatus = 'unassessable';
        diagnostics.add({
          code: 'INCOMPLETE_PROOF',
          message: 'Premise leaf has no selected problem premise.',
          stepIndex: index,
        });
      } else if (!premise?.formula) {
        localStatus = 'invalid';
        diagnostics.add({
          code: 'INVALID_REFERENCE',
          message: 'Premise leaf must identify a supplied problem premise.',
          stepIndex: index,
        });
      } else {
        budget.spend(2 * (current.size + premise.size));
        if (!sameFormula(current.formula, premise.formula)) {
          localStatus = 'invalid';
          diagnostics.add({
            code: 'RULE_MISMATCH',
            message: 'Premise leaf formula does not match its supplied problem premise.',
            stepIndex: index,
          });
        }
      }
    }
    if (node.kind === 'inference') {
      // Pattern validity and upstream support are separate; a locally correct step can depend on errors.
      const inherit = (child: number) => {
        budget.spend(1);
        const report = reports[child]!;
        if (report.localStatus === 'invalid' || report.dependencyStatus === 'invalid')
          dependencyStatus = 'invalid';
        else if (
          dependencyStatus !== 'invalid' &&
          (report.localStatus === 'unassessable' || report.dependencyStatus === 'unknown')
        )
          dependencyStatus = 'unknown';
      };
      for (const child of reference.lineIndices) {
        // Ordinary operands carry all their open assumptions into the parent inference.
        inherit(child);
        budget.spend(openAssumptions[child]!.size);
        for (const assumption of openAssumptions[child]!) support.add(assumption);
      }
      for (const [branchIndex, branch] of reference.branches.entries()) {
        inherit(branch.rootIndex);
        const declared = branchFormulas[index]![branchIndex]!;
        if (!declared.formula) {
          if (declared.status === 'invalid') dependencyStatus = 'invalid';
          else if (dependencyStatus !== 'invalid') dependencyStatus = 'unknown';
        }
        // Work on this branch's copy so discharge cannot erase assumptions from another operand.
        const remaining = new Set(openAssumptions[branch.rootIndex]!);
        budget.spend(remaining.size);
        for (const assumption of branch.assumptionIndices) {
          const formula = formulas[assumption]!;
          budget.spend(1 + 2 * (declared.size + formula.size));
          if (!remaining.has(assumption)) {
            // This also rejects occurrences already discharged deeper in the subtree.
            dependencyStatus = 'invalid';
            diagnostics.add({
              code: 'INVALID_DEPENDENCY',
              message:
                'Discharge must name an open assumption occurrence in its own supporting subtree.',
              stepIndex: index,
            });
          } else if (declared.formula && formula.formula) {
            if (!sameFormula(declared.formula, formula.formula)) {
              dependencyStatus = 'invalid';
              diagnostics.add({
                code: 'INVALID_DEPENDENCY',
                message:
                  'Discharged assumption occurrence does not match the branch assumption formula.',
                stepIndex: index,
              });
            } else remaining.delete(assumption);
          } else if (dependencyStatus !== 'invalid') dependencyStatus = 'unknown';
        }
        budget.spend(remaining.size);
        for (const assumption of remaining) support.add(assumption);
      }
      // Match only the resolved formulas here; scope/discharge and support were handled above.
      localStatus = checkParsedRule(
        input.problem,
        node.ruleId,
        current,
        reference.lineIndices.map((child) => formulas[child]!),
        reference.branches.map((branch, branchIndex) => ({
          assumption: branchFormulas[index]![branchIndex]!,
          conclusion: formulas[branch.rootIndex]!,
        })),
        index,
        budget,
        diagnostics,
      );
      if (dependencyStatus !== 'valid')
        diagnostics.add({
          code: dependencyStatus === 'invalid' ? 'INVALID_DEPENDENCY' : 'INCOMPLETE_PROOF',
          message:
            dependencyStatus === 'invalid'
              ? 'Node depends on invalid supporting work or discharge.'
              : 'Node depends on work that could not be fully checked.',
          stepIndex: index,
        });
    }
    // Keep diagnostics tied to the original submission positions, not traversal/display order.
    reports[index] = { stepId: node.id, stepIndex: index, localStatus, dependencyStatus };
    openAssumptions[index] = support;
  }
  return { reports, openAssumptions };
}
