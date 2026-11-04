import { PROOF_LIMITS, type DependencyProof, type DependencyProofStep } from '@logiclab/contracts';

export function startDependencyProof(premises: { id: string; formula: string }[]): DependencyProof {
  return {
    proofVersion: 1,
    format: 'dependency',
    steps: premises.map((premise) => {
      const id = crypto.randomUUID();
      return {
        kind: 'premise',
        id,
        premiseId: premise.id,
        formula: premise.formula,
        dependencies: [id],
      };
    }),
  };
}

export function uniqueDependencyIds(proof: DependencyProof): boolean {
  return new Set(proof.steps.map((step) => step.id)).size === proof.steps.length;
}

/** Insert without retargeting or repairing existing citations and annotations. */
export function insertDependencyStep(
  proof: DependencyProof,
  index: number,
  kind: DependencyProofStep['kind'],
): DependencyProof {
  if (!uniqueDependencyIds(proof))
    throw new Error('Repair duplicate proof identities before inserting lines.');
  if (!Number.isInteger(index) || index < 0 || index > proof.steps.length)
    throw new Error('Choose an existing insertion position.');
  if (proof.steps.length >= PROOF_LIMITS.maxSteps)
    throw new Error('The proof line limit has been reached.');
  const id = crypto.randomUUID();
  const step: DependencyProofStep =
    kind === 'premise'
      ? { kind, id, formula: '', premiseId: null, dependencies: [id] }
      : kind === 'assumption'
        ? { kind, id, formula: '', dependencies: [id] }
        : {
            kind,
            id,
            formula: '',
            dependencies: [],
            ruleId: null,
            lineReferences: [],
            discharges: [],
          };
  return { ...proof, steps: [...proof.steps.slice(0, index), step, ...proof.steps.slice(index)] };
}

export function moveDependencyStep(
  proof: DependencyProof,
  index: number,
  delta: -1 | 1,
): DependencyProof {
  const target = index + delta;
  if (!proof.steps[index] || !proof.steps[target]) return proof;
  const steps = [...proof.steps];
  [steps[index], steps[target]] = [steps[target]!, steps[index]!];
  return { ...proof, steps };
}

/** Incoming references stay visible as unresolved IDs until explicitly repaired. */
export function removeDependencyStep(proof: DependencyProof, index: number): DependencyProof {
  return { ...proof, steps: proof.steps.filter((_, position) => position !== index) };
}
