import { useLayoutEffect, useRef, useState, type InputHTMLAttributes } from 'react';
import { proofNotation } from '../helpers/proof-notation';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: string;
  onValueChange: (value: string) => void;
};

/** Translate keyboard aliases without parsing, checking, losing the caret or interrupting IME. */
export function ProofFormulaInput({ value, onValueChange, ...props }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [composing, setComposing] = useState(false);
  const caret = useRef<{ value: string; start: number; end: number } | null>(null);

  useLayoutEffect(() => {
    const next = caret.current;
    if (next && input.current?.value === next.value && document.activeElement === input.current)
      input.current.setSelectionRange(next.start, next.end);
    caret.current = null;
  });

  function update(element: HTMLInputElement, composition: boolean) {
    if (composition) {
      onValueChange(element.value);
      return;
    }
    const raw = element.value;
    const next = proofNotation(raw);
    caret.current = {
      value: next,
      start: Math.min(
        next.length,
        proofNotation(raw.slice(0, element.selectionStart ?? raw.length)).length,
      ),
      end: Math.min(
        next.length,
        proofNotation(raw.slice(0, element.selectionEnd ?? raw.length)).length,
      ),
    };
    onValueChange(next);
  }

  return (
    <input
      {...props}
      ref={input}
      value={composing ? value : proofNotation(value)}
      onCompositionStart={() => setComposing(true)}
      onCompositionEnd={(event) => {
        setComposing(false);
        update(event.currentTarget, false);
      }}
      onChange={(event) =>
        update(event.currentTarget, composing || (event.nativeEvent as InputEvent).isComposing)
      }
    />
  );
}
