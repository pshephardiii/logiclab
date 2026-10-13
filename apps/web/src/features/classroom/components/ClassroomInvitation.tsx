import { useEffect, useRef, useState } from 'react';
import type { ClassroomInvitation as Invitation } from '@logiclab/contracts';
import { replaceInvitation } from '../api';
import { AccountApiError } from '../../auth/api';
export function ClassroomInvitation({ classId, className }: { classId: string; className: string }) {
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  async function generate() {
    const controller = new AbortController(); request.current?.abort(); request.current = controller;
    setBusy(true); setError(null); setInvitation(null);
    try {
      const result = await replaceInvitation(classId, controller.signal);
      if (!controller.signal.aborted) setInvitation(result);
    } catch (caught) {
      if (!controller.signal.aborted) setError(caught instanceof AccountApiError ? caught.message : 'Could not create the invitation. Please try again.');
    } finally { if (!controller.signal.aborted) setBusy(false); }
  }
  return <section aria-label={`Invitation for ${className}`}>
    <p className="help">Generating a code replaces any previous code for this class. It expires after seven days. Share it with students so they can join this class.</p>
    <button className="secondary" disabled={busy} onClick={() => void generate()}>{busy ? 'Generating…' : 'Generate new invitation code'}</button>
    {error && <p role="alert" className="error">{error}</p>}
    {invitation && <div role="status">
      <label htmlFor={`invitation-${classId}`}>Invitation code for {className}</label>
      <input id={`invitation-${classId}`} readOnly value={invitation.code} onFocus={event => event.currentTarget.select()} />
      <p>Expires {new Date(invitation.expiresAt).toLocaleString()}. Copy it now; it cannot be displayed again after leaving this page.</p>
    </div>}
  </section>;
}
