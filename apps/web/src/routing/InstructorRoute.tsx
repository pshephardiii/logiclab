import { Navigate, Outlet } from 'react-router';
import { useAccountContext } from '../features/auth/AccountProvider';
export function InstructorRoute() {
  const { user, busy } = useAccountContext();
  if (busy) return <main><p role="status">Checking your account…</p></main>;
  if (!user) return <Navigate to="/account" replace />;
  if (user.role !== 'instructor') return <main><h1>Instructor access required</h1><p>Classes are currently managed through instructor accounts.</p></main>;
  return <Outlet />;
}
