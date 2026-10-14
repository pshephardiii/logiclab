import { encryptTokens, decryptTokens, newSessionId, sessionHash } from './crypto';
import type { AuthStore, IdentityProvider, Role, Tokens } from './types';

export class AuthError extends Error {
  constructor(public readonly code: string) { super(code); this.name = 'AuthError'; }
}
const SESSION_SECONDS = 7 * 24 * 60 * 60;

/**
 * Coordinates identity-provider operations with application users and encrypted server sessions.
 * Owns signup compensation, verified-account checks, token refresh, and local session invalidation.
 */
export function createAuthService(provider: IdentityProvider, store: AuthStore, key: string, now = () => Date.now()) {
  async function verifiedUser(tokens: Tokens) {
    const identity = await provider.identity(tokens.accessToken);
    if (!identity.verified) throw new AuthError('EMAIL_NOT_VERIFIED');
    const user = await store.findUser(identity.subject);
    if (!user) throw new AuthError('ACCOUNT_NOT_PROVISIONED');
    return user;
  }
  return {
    async signup(email: string, password: string, role: Role) {
      if (role !== 'student' && role !== 'instructor') throw new AuthError('ROLE_INVALID');
      const subject = await provider.signup(email, password);
      try { return await store.createUser(subject, role, email); }
      catch {
        try { await provider.deleteCreatedUser(subject); }
        catch { throw new AuthError('SIGNUP_RECONCILIATION_REQUIRED'); }
        throw new AuthError('SIGNUP_RETRY_REQUIRED');
      }
    },
    async login(email: string, password: string) {
      const tokens = await provider.login(email, password);
      const user = await verifiedUser(tokens);
      const id = newSessionId();
      const hash = sessionHash(id);
      await store.saveSession(hash, {
        user, encryptedTokens: encryptTokens(tokens, key, hash),
        accessExpiresAt: new Date(now() + tokens.expiresIn * 1000),
        expiresAt: new Date(now() + SESSION_SECONDS * 1000),
      });
      return { sessionId: id, maxAge: SESSION_SECONDS, user };
    },
    async authenticate(id: string) {
      if (!/^[A-Za-z0-9_-]{43}$/.test(id)) throw new AuthError('SESSION_INVALID');
      const hash = sessionHash(id);
      const session = await store.getSession(hash);
      if (!session) throw new AuthError('SESSION_INVALID');
      if (session.expiresAt.getTime() <= now()) {
        await store.deleteSession(hash);
        throw new AuthError('SESSION_EXPIRED');
      }
      if (session.accessExpiresAt.getTime() <= now()) {
        const previous = decryptTokens(session.encryptedTokens, key, hash);
        const tokens = await provider.refresh(session.user.subject, previous.refreshToken);
        const user = await verifiedUser(tokens);
        if (user.id !== session.user.id) throw new AuthError('SESSION_INVALID');
        const updated = await store.updateSession(hash, { ...session, user,
          encryptedTokens: encryptTokens(tokens, key, hash), accessExpiresAt: new Date(now() + tokens.expiresIn * 1000),
        });
        if (!updated) throw new AuthError('SESSION_INVALID');
        return user;
      }
      return session.user;
    },
    async logout(id: string) {
      const hash = sessionHash(id);
      const session = await store.getSession(hash);
      await store.deleteSession(hash);
      if (session) await provider.revoke(decryptTokens(session.encryptedTokens, key, hash).refreshToken);
    },
    confirm: (email: string, code: string) => provider.confirm(email, code),
    resend: (email: string) => provider.resend(email),
    forgotPassword: (email: string) => provider.forgotPassword(email),
    async resetPassword(email: string, code: string, password: string) {
      await provider.resetPassword(email, code, password);
      await store.deleteSessionsForEmail(email);
    },
  };
}
