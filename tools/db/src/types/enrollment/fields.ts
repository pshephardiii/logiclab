import type { User } from '../../entities/User.ts';
import type { Classroom } from '../../entities/Classroom.ts';

/** Readable field reference checked against the decorated Enrollment entity. */
export interface EnrollmentFields {
  id: string;
  classroom: Classroom;
  student: User;
  createdAt: Date;
}
