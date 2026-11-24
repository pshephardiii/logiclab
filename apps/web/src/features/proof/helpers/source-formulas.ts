import type { FitchProof, DependencyProof } from '@logiclab/contracts';
import { proofConstructionSources } from '@logiclab/logic-engine/proof';
import { formulaGroupingPolicy } from '@logiclab/contracts/formula-policy-values';

export type ProofSourceStatement = {
  ruleCatalogVersion?: 1 | 2;
  formulaGroupingVersion?: 1;
  premises: { id: string; formula: string }[];
  conclusion?: string;
  rules: { id: string }[];
};

/** Project only public statement fields and confirmed work, never a private reference or key. */
export function proofSourceFormulas(
  proof: FitchProof | DependencyProof | null,
  statement: ProofSourceStatement,
) {
  if (!proof || statement.ruleCatalogVersion !== 2) return new Map<string, string>();
  return proofConstructionSources({
    proof,
    problem: {
      ruleCatalogVersion: statement.ruleCatalogVersion,
      ...formulaGroupingPolicy(statement),
      premises: statement.premises,
      conclusion: statement.conclusion ?? '',
      permittedRuleIds: statement.rules.map((rule) => rule.id),
    },
  });
}
