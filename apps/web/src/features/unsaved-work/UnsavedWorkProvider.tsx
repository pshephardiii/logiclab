import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useBlocker, type BlockerFunction } from 'react-router';
import { DiscardChangesDialog } from './components/DiscardChangesDialog';

type RegisterDirtyWork = (id: string) => () => void;
const UnsavedWorkContext = createContext<RegisterDirtyWork | null>(null);

/** Owns one navigation blocker for all registered editors; never stores or saves their data. */
export function UnsavedWorkProvider({ children }: { children: ReactNode }) {
  const [editors, setEditors] = useState<ReadonlySet<string>>(new Set());
  const register = useCallback((id: string) => {
    setEditors((previous) => new Set(previous).add(id));
    return () =>
      setEditors((previous) => {
        const next = new Set(previous);
        next.delete(id);
        return next;
      });
  }, []);
  const dirty = editors.size > 0;
  const blocker = useBlocker(
    useCallback<BlockerFunction>(
      ({ currentLocation, nextLocation }) =>
        dirty &&
        (currentLocation.pathname !== nextLocation.pathname ||
          currentLocation.search !== nextLocation.search),
      [dirty],
    ),
  );

  useEffect(() => {
    if (!dirty) return;
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [dirty]);

  // Saving while a confirmation is open must not leave a stale pending navigation.
  useEffect(() => {
    if (!dirty && blocker.state === 'blocked') blocker.reset();
  }, [dirty, blocker]);

  return (
    <UnsavedWorkContext.Provider value={register}>
      {children}
      {dirty && blocker.state === 'blocked' && (
        <DiscardChangesDialog onStay={blocker.reset} onDiscard={blocker.proceed} />
      )}
    </UnsavedWorkContext.Provider>
  );
}

export function useDirtyWorkRegistration() {
  const register = useContext(UnsavedWorkContext);
  if (!register) throw new Error('UnsavedWorkProvider is required.');
  return register;
}
