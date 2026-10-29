import { z } from 'zod';

/** Grade disclosure for graded work; answer reveal has its own policy. */
export const gradeReleaseTimingSchema = z.enum(['on_submission', 'instructor_release']);
export type GradeReleaseTiming = z.infer<typeof gradeReleaseTimingSchema>;
