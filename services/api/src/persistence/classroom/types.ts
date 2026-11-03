import type { ClassroomSummary } from '@logiclab/contracts';

export interface ClassroomStore {
  join(studentId: string, hash: string): Promise<ClassroomSummary | null>;
  listEnrolled(studentId: string, limit: number, offset: number): Promise<ClassroomSummary[]>;
  findEnrolled(studentId: string, classId: string): Promise<ClassroomSummary | null>;
  create(ownerId: string, name: string): Promise<ClassroomSummary>;
  list(ownerId: string, limit: number, offset: number): Promise<ClassroomSummary[]>;
  replaceInvitation(
    ownerId: string,
    classId: string,
    hash: string,
    expiresAt: Date,
  ): Promise<boolean>;
  findOwned(ownerId: string, classId: string): Promise<ClassroomSummary | null>;
}
