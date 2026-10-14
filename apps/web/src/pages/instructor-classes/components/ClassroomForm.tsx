import { useState, type FormEvent } from 'react';

type Props = {
  busy: boolean;
  onCreate: (name: string) => Promise<boolean>;
};

export function ClassroomForm({ busy, onCreate }: Props) {
  const [name, setName] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const created = await onCreate(name);
    if (created) setName('');
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="class-name">Class name</label>
      <div className="form-row">
        <input
          id="class-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          maxLength={120}
          disabled={busy}
        />
        <button type="submit" disabled={busy || !name.trim()}>
          Create class
        </button>
      </div>
    </form>
  );
}
