import { useConfirmDiscard } from '../../features/unsaved-work/hooks/useConfirmDiscard';
import './demo.css';
import { useNavigate } from 'react-router';
import { Page } from '../../components/layout/Page';
import { useAccountContext } from '../../features/auth/AccountProvider';

/** Entry and control panel for one isolated, resettable instructor/student workspace. */
export function DemoPage() {
  const { demo } = useAccountContext();
  const navigate = useNavigate();
  const confirmDiscard = useConfirmDiscard();
  async function explore(role: 'instructor' | 'student') {
    if (await demo.run(demo.session ? 'role' : 'start', role))
      navigate(role === 'instructor' ? '/demo/classes' : '/demo/work');
  }
  return (
    <Page className="demo-page">
      <h1>Explore LogicLab</h1>
      <p>Try both sides of a classroom using isolated synthetic data. No signup required.</p>
      <p>Payments are simulated. No real charges or payment details.</p>
      <p>
        Start with a funded class and a published truth-table assignment, or try checkout on the
        unpaid class. Switch roles to follow the same work from instructor to student.
      </p>
      <p>
        Demo data expires after inactivity and has a maximum lifetime. Reset discards your changes
        and restores the starting examples.
      </p>
      {demo.error && <p role="alert">{demo.error}</p>}
      {demo.busy && <p role="status">Updating demo…</p>}
      {demo.session && <p>Current demo role: {demo.session.user.role}</p>}
      <div className="demo-actions">
        <button
          disabled={demo.busy}
          onClick={() => confirmDiscard(() => void explore('instructor'))}
        >
          Explore as instructor
        </button>
        <button disabled={demo.busy} onClick={() => confirmDiscard(() => void explore('student'))}>
          Explore as student
        </button>
        {demo.session && (
          <>
            <button
              disabled={demo.busy}
              onClick={() => confirmDiscard(() => void demo.run('reset'))}
            >
              Reset demo and discard changes
            </button>
            <button
              disabled={demo.busy}
              onClick={() => confirmDiscard(() => void demo.run('logout'))}
            >
              End demo
            </button>
          </>
        )}
      </div>
    </Page>
  );
}
