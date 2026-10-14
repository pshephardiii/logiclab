import { useState } from 'react';
type Props = { busy: boolean; onCreate: (name: string) => Promise<boolean> };
export function ClassroomForm({ busy, onCreate }: Props) {
  const [name, setName] = useState('');
  return <form onSubmit={event => {
    event.preventDefault(); void onCreate(name).then(created => { if (created) setName(''); });
  }}>
    <label htmlFor="class-name">Class name</label>
    <div className="form-row">
      <input id="class-name" value={name} onChange={event => setName(event.target.value)} required maxLength={120} disabled={busy} />
      <button disabled={busy || !name.trim()} type="submit">Create class</button>
    </div>
  </form>;
}
