import type { AccountView } from '../../../features/auth/hooks/useAccount';

export const ACCOUNT_FORM_TITLES: Record<AccountView, string> = {
  login: 'Sign in',
  signup: 'Create account',
  confirm: 'Confirm email',
  'forgot-password': 'Send reset code',
  'reset-password': 'Reset password',
};

export const ACCOUNT_VIEW_HEADINGS: Record<AccountView, string> = {
  login: 'Welcome back',
  signup: 'Join LogicLab',
  confirm: 'Check your email',
  'forgot-password': 'Recover your account',
  'reset-password': 'Choose a new password',
};

export const ACCOUNT_NAVIGATION_ITEMS = [
  { view: 'login', label: 'Sign in' },
  { view: 'signup', label: 'Create account' },
  { view: 'confirm', label: 'Confirm email' },
  { view: 'forgot-password', label: 'Forgot password?' },
] as const;
