import { appendClassroomPage } from '../../../features/classroom/helpers/classroom-pages';
import { useEffect, useRef, useState } from 'react';
import type { ClassroomSummary } from '@logiclab/contracts';
import { AccountApiError } from '../../../api/errors';
import { joinClassroom, listEnrollments } from '../../../api/enrollments/api';

export function useStudentClasses() {
  const [classrooms, setClassrooms] = useState<ClassroomSummary[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const pending = useRef<AbortController | null>(null);

  async function joinClass(code: string, signal: AbortSignal) {
    const classroom = await joinClassroom(code, signal);
    if (signal.aborted) return;
    // Show the committed result without requiring another request.
    setClassrooms(current => [classroom, ...current.filter(row => row.id !== classroom.id)]);
    // Joining may already exist; reload before requesting further offset pages.
    setNextOffset(null);
    setNotice(`You are enrolled in ${classroom.name}. Reload classes to see your complete list.`);
  }

  async function loadClasses(append: boolean, signal: AbortSignal) {
    const result = await listEnrollments(signal, append ? nextOffset ?? 0 : 0);
    if (signal.aborted) return;
    setClassrooms(current => append ? appendClassroomPage(current, result.classrooms) : result.classrooms);
    setNextOffset(result.nextOffset);
  }

  async function run(action: 'list' | 'more' | 'join', code?: string): Promise<boolean> {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (action === 'join') await joinClass(code!, controller.signal);
      else await loadClasses(action === 'more', controller.signal);
      if (controller.signal.aborted) return false;
      return true;
    } catch (caught) {
      if (!controller.signal.aborted) setError(caught instanceof AccountApiError ? caught.message : 'Could not complete the request. Please try again.');
      return false;
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  useEffect(() => {
    void run('list');
    return () => pending.current?.abort();
  }, []);
  return { classrooms, nextOffset, busy, error, notice, run };
}
