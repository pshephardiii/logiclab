import { useEffect, useId } from 'react';
import { useDirtyWorkRegistration } from '../UnsavedWorkProvider';

/** Registers only whether an editor is dirty; saving or unmounting removes its protection. */
export function useUnsavedWork(dirty: boolean) {
  const id = useId();
  const register = useDirtyWorkRegistration();
  useEffect(() => {
    if (dirty) return register(id);
  }, [dirty, id, register]);
}
