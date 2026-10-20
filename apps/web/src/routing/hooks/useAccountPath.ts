import { useLocation } from 'react-router';
import { isDemoPath } from '../demo-path';

/** Keep resource links in the current account flow; practice and normal sign-in stay shared. */
export function useAccountPath() {
  const { pathname } = useLocation();
  return (path: string) =>
    isDemoPath(pathname) && path !== '/' && path !== '/account' ? `/demo${path}` : path;
}
