/** Frozen point allocation/award snapshot; correctness remains in the separate result field. */
export type AssignmentItemScore =
  | { itemId: string; maxPoints: number; status: 'graded'; earnedPoints: number }
  | { itemId: string; maxPoints: number; status: 'needs_review'; earnedPoints: null };
export interface AssignmentScore {
  scoringVersion: 'points_v1';
  items: AssignmentItemScore[];
  summary:
    | { status: 'graded'; maxPoints: number; earnedPoints: number; percentage: number }
    | { status: 'needs_review'; maxPoints: number; earnedPoints: null; percentage: null };
}
