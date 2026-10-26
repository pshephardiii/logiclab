import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useBlocker, type BlockerFunction } from 'react-router';
import { DiscardChangesDialog } from './components/DiscardChangesDialog';

type RegisterDirtyWork = (id: string) => () => void;
type LocalTransition = { owner: string; run: () => void };
type UnsavedWorkContextValue = {
  register: RegisterDirtyWork;
  confirm: (owner: string, run: () => void) => void;
  cancel: (owner: string) => void;
};
const UnsavedWorkContext = createContext<UnsavedWorkContextValue | null>(null);

/** Owns one navigation blocker for all registered editors; never stores or saves their data. */
export function UnsavedWorkProvider({ children }: { children: ReactNode }) {
  const editorsRef = useRef(new Set<string>());
  const [editors, setEditors] = useState<ReadonlySet<string>>(new Set());
  const register = useCallback((id: string) => {
    editorsRef.current.add(id);
    setEditors(new Set(editorsRef.current));
    return () => {
      // Unregistration must be visible before a forced session redirect runs its effect.
      editorsRef.current.delete(id);
      setEditors(new Set(editorsRef.current));
    };
  }, []);
  const [pending, setPending] = useState<LocalTransition | null>(null);
  const pendingRef = useRef<LocalTransition | null>(null);
  const clearPending = useCallback(() => {
    pendingRef.current = null;
    setPending(null);
  }, []);
  const cancel = useCallback(
    (owner: string) => {
      if (pendingRef.current?.owner === owner) clearPending();
    },
    [clearPending],
  );
  const dirty = editors.size > 0;
  const blocker = useBlocker(
    useCallback<BlockerFunction>(
      ({ currentLocation, nextLocation }) =>
        editorsRef.current.size > 0 &&
        (currentLocation.pathname !== nextLocation.pathname ||
          currentLocation.search !== nextLocation.search),
      [],
    ),
  );

  useEffect(() => {
    if (!dirty) return;
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      if (editorsRef.current.size === 0) return;
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [dirty]);

  const confirm = useCallback(
    (owner: string, run: () => void) => {
      if (pendingRef.current || blocker.state !== 'unblocked') return;
      if (editorsRef.current.size === 0) {
        run();
        return;
      }
      const transition = { owner, run };
      pendingRef.current = transition;
      setPending(transition);
    },
    [blocker.state],
  );
  function discardLocalChanges() {
    const transition = pendingRef.current;
    clearPending();
    transition?.run();
  }

  useEffect(() => {
    // Prefer a router transition over a stale local action; never keep two confirmations alive.
    if (!dirty || blocker.state !== 'unblocked') clearPending();
  }, [dirty, blocker.state, clearPending]);

  // Saving while a confirmation is open must not leave a stale pending navigation.
  useEffect(() => {
    if (!dirty && blocker.state === 'blocked') blocker.reset();
  }, [dirty, blocker]);

  return (
    <UnsavedWorkContext.Provider value={{ register, confirm, cancel }}>
      {children}
      {dirty && pending && blocker.state === 'unblocked' && (
        <DiscardChangesDialog onStay={clearPending} onDiscard={discardLocalChanges} />
      )}
      {dirty && blocker.state === 'blocked' && (
        <DiscardChangesDialog onStay={blocker.reset} onDiscard={blocker.proceed} />
      )}
    </UnsavedWorkContext.Provider>
  );
}

export function useDirtyWorkRegistration() {
  const register = useContext(UnsavedWorkContext);
  if (!register) throw new Error('UnsavedWorkProvider is required.');
  return register.register;
}

export function useDiscardConfirmationContext() {
  const context = useContext(UnsavedWorkContext);
  if (!context) throw new Error('UnsavedWorkProvider is required.');
  return context;
}
