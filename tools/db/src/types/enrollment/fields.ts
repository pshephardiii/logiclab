import type { User } from '../../entities/User.js';
import type { Classroom } from '../../entities/Classroom.js';

/** Readable field reference checked against the decorated Enrollment entity. */
export interface EnrollmentFields {
  id: string;
  classroom: Classroom;
  student: User;
  createdAt: Date;
}
