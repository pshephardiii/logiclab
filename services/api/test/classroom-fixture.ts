import { authFixture, authUser } from './auth-fixture';
import type { ClassroomContext } from '../src/routes/classroom/context';
export const classroom = { id: 'fcba1f3e-7c83-4d9e-a319-8e6393ae21f1', name: 'Introduction to logic', createdAt: '2026-10-12T12:00:00.000Z' };
export function classroomFixture() {
  const auth = authFixture();
  const classrooms = {
    join: jest.fn(async (): Promise<typeof classroom | null> => classroom),
    listEnrolled: jest.fn(async () => [classroom]),
    findEnrolled: jest.fn(async (): Promise<typeof classroom | null> => classroom),
    replaceInvitation: jest.fn(async () => true),
    create: jest.fn(async () => classroom), list: jest.fn(async () => [classroom]), findOwned: jest.fn(async (): Promise<typeof classroom | null> => classroom),
  };
  const context: ClassroomContext = { ...auth.context, classrooms };
  return { ...auth, context, classrooms, user: authUser };
}
