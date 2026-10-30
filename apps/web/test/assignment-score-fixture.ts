import type { AssignmentScore } from '@logiclab/contracts';
import { itemA, itemB } from './assignment-work-fixture';

export const pointScore: AssignmentScore = {
  scoringVersion: 'points_v1',
  items: [
    { itemId: itemA, status: 'graded', maxPoints: 20, earnedPoints: 5 },
    { itemId: itemB, status: 'graded', maxPoints: 5, earnedPoints: 0 },
  ],
  summary: { status: 'graded', maxPoints: 25, earnedPoints: 5, percentage: 20 },
};
