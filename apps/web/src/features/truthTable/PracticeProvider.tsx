import { createContext, useContext, type ReactNode } from 'react';
import { useTruthTablePractice } from './useTruthTablePractice';
const PracticeContext = createContext<ReturnType<typeof useTruthTablePractice> | null>(null);
export function PracticeProvider({ children }: { children: ReactNode }) {
  const practice = useTruthTablePractice();
  return <PracticeContext.Provider value={practice}>{children}</PracticeContext.Provider>;
}
export function usePracticeContext() {
  const practice = useContext(PracticeContext);
  if (!practice) throw new Error('PracticeProvider is required.');
  return practice;
}
