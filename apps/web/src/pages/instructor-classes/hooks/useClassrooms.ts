import { useResourceApi } from '../../../api/ResourceApiProvider';
import { useAbortableRequest } from '../../../hooks/useAbortableRequest';
import { appendClassroomPage } from '../../../features/classroom/helpers/classroom-pages';
import { useEffect, useState } from 'react';
import type { ClassroomSummary } from '@logiclab/contracts';
import { AccountApiError } from '../../../api/errors';
import * as classroomsApi from '../../../api/classrooms/api';

/**
 * Manages the instructor's owned-class list, creation, and offset pagination.
 * Shows successful creations immediately and reports success so callers can decide when to clear input.
 */
export function useClassrooms() {
  const { createClassroom, listClassrooms } = useResourceApi(classroomsApi);
  const [classrooms, setClassrooms] = useState<ClassroomSummary[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { startRequest } = useAbortableRequest();

  async function createClass(name: string, signal: AbortSignal) {
    const classroom = await createClassroom(name, signal);
    if (signal.aborted) return;
    // Show the committed result without requiring another request.
    setClassrooms((current) => [classroom, ...current]);
    setNextOffset((current) => (current === null ? null : current + 1));
    setNotice(`Created ${classroom.name}.`);
  }

  async function loadClasses(append: boolean, signal: AbortSignal) {
    const result = await listClassrooms(signal, append ? (nextOffset ?? 0) : 0);
    if (signal.aborted) return;
    setClassrooms((current) =>
      append ? appendClassroomPage(current, result.classrooms) : result.classrooms,
    );
    setNextOffset(result.nextOffset);
  }

  async function run(action: 'list' | 'more' | 'create', name?: string): Promise<boolean> {
    const signal = startRequest();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (action === 'create') {
        await createClass(name!, signal);
      } else await loadClasses(action === 'more', signal);
      if (signal.aborted) return false;
      return true;
    } catch (caught) {
      if (!signal.aborted) {
        setError(
          caught instanceof AccountApiError
            ? caught.message
            : 'Could not complete the request. Please try again.',
        );
      }
      return false;
    } finally {
      if (!signal.aborted) setBusy(false);
    }
  }
  useEffect(() => {
    void run('list');
  }, []);
  return { classrooms, nextOffset, busy, error, notice, run };
}
