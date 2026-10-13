import { useEffect, useRef, useState } from 'react';
import type { ClassroomSummary } from '@logiclab/contracts';
import { AccountApiError } from '../auth/api';
import { createClassroom, listClassrooms } from './api';

export function useClassrooms() {
  const [classrooms, setClassrooms] = useState<ClassroomSummary[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const pending = useRef<AbortController | null>(null);

  async function run(action: 'list' | 'more' | 'create', name?: string): Promise<boolean> {
    pending.current?.abort(); const controller = new AbortController(); pending.current = controller;
    setBusy(true); setError(null); setNotice(null);
    try {
      if (action === 'create') {
        const classroom = await createClassroom(name!, controller.signal);
        if (controller.signal.aborted) return false;
        // Show the committed result without requiring another request.
        setClassrooms(current => [classroom, ...current]);
        setNextOffset(current => current === null ? null : current + 1);
        setNotice(`Created ${classroom.name}.`);
      } else {
        const result = await listClassrooms(controller.signal, action === 'more' ? nextOffset ?? 0 : 0);
        if (controller.signal.aborted) return false;
        setClassrooms(current => action === 'more' ? [...current, ...result.classrooms.filter(row => !current.some(existing => existing.id === row.id))] : result.classrooms);
        setNextOffset(result.nextOffset);
      }
      return true;
    } catch (caught) {
      if (!controller.signal.aborted) setError(caught instanceof AccountApiError ? caught.message : 'Could not complete the request. Please try again.');
      return false;
    } finally { if (!controller.signal.aborted) setBusy(false); }
  }
  useEffect(() => { void run('list'); return () => pending.current?.abort(); }, []);
  return { classrooms, nextOffset, busy, error, notice, run };
}
