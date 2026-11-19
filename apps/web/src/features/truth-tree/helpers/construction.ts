import {
  truthTreeSchema,
  TRUTH_TREE_LIMITS,
  type TruthTree,
  type TruthTreeClosure,
} from '@logiclab/contracts/truth-tree';
import type { TruthTreeContent } from '@logiclab/contracts/truth-tree-authoring';
import {
  analyzeTruthTreeStructure,
  parseTruthTreeFormula,
  TRUTH_TREE_RULE_CATALOG,
} from '@logiclab/logic-engine/truth-tree';
import { sameFormula } from '@logiclab/logic-engine/proof';

/** Fresh initial sources only; no decomposition, closure or expected outcome is supplied. */
export function initialTruthTree(
  statement: Pick<TruthTreeContent, 'premises' | 'conclusion'>,
): TruthTree {
  const root = crypto.randomUUID();
  const occurrences: TruthTree['occurrences'] = statement.premises.map((premise) => ({
    id: crypto.randomUUID(),
    formula: premise.formula,
    origin: { kind: 'premise', premiseId: premise.id },
  }));
  occurrences.push({
    id: crypto.randomUUID(),
    formula: `¬(${statement.conclusion})`,
    origin: { kind: 'negated_conclusion' },
  });

  return boundedTree({
    treeVersion: 1,
    format: 'truth_tree',
    rootBranchId: root,
    occurrences,
    branches: [
      {
        id: root,
        parentId: null,
        occurrenceIds: occurrences.map((item) => item.id),
        ending: { kind: 'open' },
      },
    ],
    expansions: [],
  });
}

function boundedTree(tree: TruthTree): TruthTree {
  const parsed = truthTreeSchema.safeParse(tree);

  if (!parsed.success)
    throw new Error(
      'This change exceeds the truth-tree size or formula limits. Shorten the formula or undo an expansion.',
    );

  const structure = analyzeTruthTreeStructure(parsed.data);

  if (structure.status !== 'resolved')
    throw new Error(
      structure.diagnostics[0]?.message ?? 'The tree structure cannot be edited safely.',
    );

  return parsed.data;
}

/** Existing incomplete/unsafe API drafts remain saveable; construction requires an unambiguous graph. */
export function editableTree(tree: TruthTree) {
  const resolved = analyzeTruthTreeStructure(tree);
  return resolved.status === 'resolved' ? resolved.structure : null;
}

/** Statement changes never silently delete or rewrite a private reference. */
export function truthTreeInitialMatches(
  statement: Pick<TruthTreeContent, 'premises' | 'conclusion'>,
  tree: TruthTree,
): boolean {
  const initial = tree.occurrences.filter((item) => item.origin.kind !== 'expansion');

  if (initial.length !== statement.premises.length + 1) return false;

  try {
    for (const premise of statement.premises) {
      const matches = initial.filter(
        (item) => item.origin.kind === 'premise' && item.origin.premiseId === premise.id,
      );

      if (
        matches.length !== 1 ||
        !sameFormula(
          parseTruthTreeFormula(matches[0]!.formula),
          parseTruthTreeFormula(premise.formula),
        )
      )
        return false;
    }

    const conclusion = initial.filter((item) => item.origin.kind === 'negated_conclusion');

    return (
      conclusion.length === 1 &&
      sameFormula(parseTruthTreeFormula(conclusion[0]!.formula), {
        type: 'not',
        operand: parseTruthTreeFormula(statement.conclusion),
      })
    );
  } catch {
    return false;
  }
}

/** Add the entered formulas with fresh identities. Logical correctness belongs to Check tree. */
export function appendTruthTreeExpansion(
  tree: TruthTree,
  branchId: string,
  sourceId: string,
  ruleId: string,
  formulas: string[][],
): TruthTree {
  const structure = editableTree(tree);
  const rule = TRUTH_TREE_RULE_CATALOG.find((rule) => rule.id === ruleId);
  const branch = structure?.branches.get(branchId);

  if (
    !structure ||
    branch?.ending.kind !== 'open' ||
    !structure.paths.get(branchId)?.includes(sourceId) ||
    !rule ||
    formulas.length !== rule.resultFormulaCounts.length ||
    formulas.some(
      (group, index) =>
        group.length !== rule.resultFormulaCounts[index] ||
        group.some((formula) => !formula.trim()),
    )
  )
    throw new Error('Choose an open branch, source, rule and every resulting formula.');

  if (rule.branching) {
    let depth = 0;
    let parent = branch.parentId;
    while (parent !== null) {
      depth++;
      parent = structure.branches.get(parent)!.parentId;
    }
    if (depth + 1 > TRUTH_TREE_LIMITS.maxBranchDepth)
      throw new Error('The tree nesting limit has been reached.');
  }

  const next = structuredClone(tree);
  const target = next.branches.find((item) => item.id === branchId)!;
  const id = crypto.randomUUID();
  const groups = formulas.map((group) => {
    const destinationId = rule.branching ? crypto.randomUUID() : branchId;
    const occurrences: TruthTree['occurrences'] = group.map((formula) => ({
      id: crypto.randomUUID(),
      formula,
      origin: { kind: 'expansion', expansionId: id },
    }));
    next.occurrences.push(...occurrences);
    if (rule.branching)
      next.branches.push({
        id: destinationId,
        parentId: branchId,
        occurrenceIds: occurrences.map((item) => item.id),
        ending: { kind: 'open' },
      });
    else target.occurrenceIds.push(...occurrences.map((item) => item.id));
    return { branchId: destinationId, occurrenceIds: occurrences.map((item) => item.id) };
  });
  if (rule.branching)
    target.ending = {
      kind: 'split',
      expansionId: id,
      childBranchIds: groups.map((group) => group.branchId),
    };
  next.expansions.push({ id, branchId, sourceId, ruleId, resultGroups: groups });

  return boundedTree(next);
}

/** Witness selection is structural only: an incorrect closure is retained for checker feedback. */
export function closeTruthTreeBranch(
  tree: TruthTree,
  branchId: string,
  closure: TruthTreeClosure,
): TruthTree {
  const structure = editableTree(tree);
  const branch = structure?.branches.get(branchId);

  if (branch?.ending.kind !== 'open') throw new Error('Choose an open branch.');

  const next = structuredClone(tree);
  next.branches.find((item) => item.id === branchId)!.ending = { kind: 'closed', closure };
  return boundedTree(next);
}

export function reopenTruthTreeBranch(tree: TruthTree, branchId: string): TruthTree {
  if (editableTree(tree)?.branches.get(branchId)?.ending.kind !== 'closed')
    throw new Error('Choose a closed branch.');

  const next = structuredClone(tree);
  next.branches.find((item) => item.id === branchId)!.ending = { kind: 'open' };
  return boundedTree(next);
}

/** Undo only a terminal last expansion; refuse foreign/reordered structures with downstream work. */
export function undoTruthTreeExpansion(tree: TruthTree): TruthTree | null {
  const structure = editableTree(tree);
  const expansion = tree.expansions.at(-1);
  if (!structure || !expansion) return null;

  const branch = structure.branches.get(expansion.branchId)!;
  const children = expansion.resultGroups
    .filter((group) => group.branchId !== branch.id)
    .map((group) => group.branchId);
  const removedIds = new Set(expansion.resultGroups.flatMap((group) => group.occurrenceIds));
  if (
    tree.expansions.some(
      (item) =>
        item.id !== expansion.id &&
        (children.includes(item.branchId) ||
          (item.sourceId !== null && removedIds.has(item.sourceId))),
    )
  )
    return null;
  if (children.some((id) => structure.branches.get(id)?.ending.kind === 'split')) return null;
  if (
    children.length
      ? branch.ending.kind !== 'split' || branch.ending.expansionId !== expansion.id
      : branch.ending.kind === 'split'
  )
    return null;

  const next = structuredClone(tree);
  next.expansions = next.expansions.filter((item) => item.id !== expansion.id);
  next.occurrences = next.occurrences.filter((item) => !removedIds.has(item.id));
  next.branches = next.branches.filter((item) => !children.includes(item.id));
  const target = next.branches.find((item) => item.id === branch.id)!;
  target.occurrenceIds = target.occurrenceIds.filter((id) => !removedIds.has(id));
  target.ending = { kind: 'open' };
  try {
    return boundedTree(next);
  } catch {
    return null;
  }
}
