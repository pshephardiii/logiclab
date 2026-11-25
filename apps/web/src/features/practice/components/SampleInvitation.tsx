import type { ReactNode } from 'react';
import '../sample-actions.css';

/** Static guidance for first-time visitors; this is not an urgent alert or a confirmation. */
export function SampleInvitation({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <aside className="sample-invitation" aria-label={title}>
      <div className="sample-invitation-copy">
        <p className="sample-invitation-title">{title}</p>
        <p>{description}</p>
      </div>
      <div className="practice-sample-actions">{children}</div>
    </aside>
  );
}
