export type Role = 'student' | 'instructor';
export type AppUser = { id: string; subject: string; role: Role };
export type Tokens = { accessToken: string; refreshToken: string; expiresIn: number };
export interface IdentityProvider {
  signup(email: string, password: string): Promise<string>;
  deleteCreatedUser(subject: string): Promise<void>;
  login(email: string, password: string): Promise<Tokens>;
  refresh(subject: string, refreshToken: string): Promise<Tokens>;
  identity(accessToken: string): Promise<{ subject: string; verified: boolean }>;
  revoke(refreshToken: string): Promise<void>;
  confirm(email: string, code: string): Promise<void>;
  resend(email: string): Promise<void>;
  forgotPassword(email: string): Promise<void>;
  resetPassword(email: string, code: string, password: string): Promise<void>;
}
export type StoredSession = {
  user: AppUser;
  encryptedTokens: string;
  accessExpiresAt: Date;
  expiresAt: Date;
};
export interface AuthStore {
  createUser(subject: string, role: Role, email: string): Promise<AppUser>;
  deleteSessionsForEmail(email: string): Promise<void>;
  findUser(subject: string): Promise<AppUser | null>;
  saveSession(hash: string, session: StoredSession): Promise<void>;
  updateSession(hash: string, session: StoredSession): Promise<boolean>;
  getSession(hash: string): Promise<StoredSession | null>;
  deleteSession(hash: string): Promise<void>;
}
