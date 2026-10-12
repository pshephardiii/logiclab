import { useEffect, useState } from 'react';
import { healthResponseSchema } from '@logiclab/schema';

export function App() {
  const [status, setStatus] = useState('Connecting…');
  useEffect(() => {
    const controller = new AbortController();
    const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
    async function checkHealth() {
      try {
        const response = await fetch(`${base}/api/health`, { signal: controller.signal });
        if (!response.ok) throw new Error('Health check failed');
        healthResponseSchema.parse(await response.json());
        setStatus('Connected');
      } catch {
        if (!controller.signal.aborted) setStatus('Unavailable — check that the backend is running.');
      }
    }
    void checkHealth();
    return () => controller.abort();
  }, []);
  return (
    <main>
      <p className="eyebrow">LogicLab</p>
      <h1>A space to practice clear thinking.</h1>
      <p>Interactive propositional logic practice is coming next.</p>
      <p className="status" role="status">API status: {status}</p>
    </main>
  );
}
