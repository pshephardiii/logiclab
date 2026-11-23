import { formulaGroupingPolicy } from '@logiclab/contracts/formula-policy-values';
import type { TruthTreeContent } from '@logiclab/contracts/truth-tree-authoring';
import type { TruthTree } from '@logiclab/contracts/truth-tree';
import { truthTreeConstructionSources } from '@logiclab/logic-engine/truth-tree';

/** Shared by editing and read-only review; project public statement fields, never a private key. */
export function truthTreeSourceFormulas(tree: TruthTree, statement?: TruthTreeContent) {
  if (!statement || tree.treeVersion !== 2) return new Map<string, string>();

  return truthTreeConstructionSources({
    tree,
    problem: {
      ruleCatalogVersion: statement.ruleCatalogVersion,
      ...formulaGroupingPolicy(statement),
      premises: statement.premises,
      conclusion: statement.conclusion,
    },
  });
}
