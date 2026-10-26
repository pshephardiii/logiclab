import { useCallback, useEffect, useId } from 'react';
import { useDiscardConfirmationContext } from '../UnsavedWorkProvider';

/** Confirms one same-page action; canceling or unmounting never executes the pending callback. */
export function useConfirmDiscard() {
  const owner = useId();
  const { confirm, cancel } = useDiscardConfirmationContext();
  useEffect(() => () => cancel(owner), [cancel, owner]);
  return useCallback((run: () => void) => confirm(owner, run), [confirm, owner]);
}
