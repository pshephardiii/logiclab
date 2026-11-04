import type { ProofDiagnostic } from '@logiclab/contracts';

export type FitchBlockSpan = {
  id: string;
  parentId: string | null;
  assumptionIndex: number;
  endIndex: number | null;
};

export type ClosedFitchBlockSpan = FitchBlockSpan & { endIndex: number };

export type FitchReferenceCheck =
  | {
      status: 'resolved';
      stepIndex: number;
      lineIndices: number[];
      subproofs: ClosedFitchBlockSpan[];
    }
  | { status: 'invalid' | 'unassessable'; stepIndex: number };

/** Resolved structure is not proof acceptance; inspect diagnostics and individual citations. */
export type FitchStructureResult =
  | { status: 'invalid' | 'unassessable'; diagnostics: ProofDiagnostic[] }
  | {
      status: 'resolved';
      diagnostics: ProofDiagnostic[];
      blocks: FitchBlockSpan[];
      references: FitchReferenceCheck[];
    };

export type FitchLayout = {
  stepIndices: Map<string, number>;
  blocks: Map<string, FitchBlockSpan>;
  paths: string[][];
};
