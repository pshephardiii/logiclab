import { z } from 'zod';

/** Account roles shared by authentication, demo sessions, routes and persistence. */
export const UserRole = {
  Student: 'student',
  Instructor: 'instructor',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const userRoleSchema = z.enum(UserRole);
