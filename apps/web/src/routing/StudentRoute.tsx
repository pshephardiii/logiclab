import { Navigate, Outlet } from 'react-router';
import { useAccountContext } from '../features/auth/AccountProvider';
export function StudentRoute() {
  const { user, busy } = useAccountContext();
  if (busy) return <main><p role="status">Checking your account…</p></main>;
  if (!user) return <Navigate to="/account" replace />;
  if (user.role !== 'student') return <main><h1>Student access required</h1><p>Joining classes requires a student account.</p></main>;
  return <Outlet />;
}
