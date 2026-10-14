import { useState, type FormEvent } from 'react';

type Props = {
  busy: boolean;
  onJoin: (code: string) => Promise<boolean>;
};

export function JoinClassForm({ busy, onJoin }: Props) {
  const [code, setCode] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const joined = await onJoin(code);
    if (joined) setCode('');
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="join-code">Invitation code</label>
      <div className="form-row">
        <input
          id="join-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          required
          maxLength={128}
          disabled={busy}
          autoComplete="off"
          spellCheck={false}
          aria-describedby="join-help"
        />
        <button type="submit" disabled={busy || !code.trim()}>
          Join class
        </button>
      </div>
      <p id="join-help" className="help">
        Paste the current code from your instructor. You can join more than one class.
      </p>
    </form>
  );
}
