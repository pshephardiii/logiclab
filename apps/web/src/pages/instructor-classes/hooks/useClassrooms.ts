import { appendClassroomPage } from '../../../features/classroom/helpers/classroom-pages';
import { useEffect, useRef, useState } from 'react';
import type { ClassroomSummary } from '@logiclab/contracts';
import { AccountApiError } from '../../../api/errors';
import { createClassroom, listClassrooms } from '../../../api/classrooms/api';

export function useClassrooms() {
  const [classrooms, setClassrooms] = useState<ClassroomSummary[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const pending = useRef<AbortController | null>(null);

  async function createClass(name: string, signal: AbortSignal) {
    const classroom = await createClassroom(name, signal);
    if (signal.aborted) return;
    // Show the committed result without requiring another request.
    setClassrooms(current => [classroom, ...current]);
    setNextOffset(current => current === null ? null : current + 1);
    setNotice(`Created ${classroom.name}.`);
  }

  async function loadClasses(append: boolean, signal: AbortSignal) {
    const result = await listClassrooms(signal, append ? nextOffset ?? 0 : 0);
    if (signal.aborted) return;
    setClassrooms(current => append ? appendClassroomPage(current, result.classrooms) : result.classrooms);
    setNextOffset(result.nextOffset);
  }

  async function run(action: 'list' | 'more' | 'create', name?: string): Promise<boolean> {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (action === 'create') await createClass(name!, controller.signal);
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
