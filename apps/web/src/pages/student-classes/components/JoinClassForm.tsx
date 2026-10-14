import { useState } from 'react';
export function JoinClassForm({ busy, onJoin }: { busy: boolean; onJoin: (code: string) => Promise<boolean> }) {
  const [code, setCode] = useState('');
  return <form onSubmit={event => { event.preventDefault();void onJoin(code).then(joined => { if (joined) setCode(''); }); }}>
    <label htmlFor="join-code">Invitation code</label>
    <div className="form-row">
      <input id="join-code" value={code} onChange={event => setCode(event.target.value)} disabled={busy} required maxLength={128} autoComplete="off" spellCheck={false} aria-describedby="join-help" />
      <button type="submit" disabled={busy || !code.trim()}>Join class</button>
    </div>
    <p id="join-help" className="help">Paste the current code from your instructor. You can join more than one class.</p>
  </form>;
}
