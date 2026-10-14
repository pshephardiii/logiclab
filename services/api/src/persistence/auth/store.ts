import type { User as UserEntity } from '@logiclab/db' with { 'resolution-mode': 'import' };
import type { createDatabase } from '@logiclab/db' with { 'resolution-mode': 'import' };
import type { AuthStore, AppUser } from '../../application/auth/types';

/**
 * Implements pool-scoped users and session persistence through forked EntityManagers.
 * Session refresh updates existing records so concurrent logout cannot recreate a deleted session.
 */
export async function createAuthStore(
  orm: Awaited<ReturnType<typeof createDatabase>>,
  poolId: string,
): Promise<AuthStore> {
  const { User, AuthSession, UserRole } = await import('@logiclab/db');
  const appUser = (user: UserEntity): AppUser => ({
    id: user.id,
    subject: user.cognitoSubject,
    role: user.role,
  });
  return {
    async createUser(subject, role, email) {
      const em = orm.em.fork();
      const user = em.create(User, {
        cognitoUserPoolId: poolId,
        cognitoSubject: subject,
        role: role === 'student' ? UserRole.Student : UserRole.Instructor,
        email,
      });
      em.persist(user);
      await em.flush();
      return appUser(user);
    },
    async findUser(subject) {
      const user = await orm.em
        .fork()
        .findOne(User, { cognitoUserPoolId: poolId, cognitoSubject: subject });
      return user ? appUser(user) : null;
    },
    async saveSession(id, session) {
      const em = orm.em.fork();
      const record = em.create(AuthSession, {
        id,
        user: em.getReference(User, session.user.id),
        encryptedTokens: session.encryptedTokens,
        accessExpiresAt: session.accessExpiresAt,
        expiresAt: session.expiresAt,
      });
      em.persist(record);
      await em.flush();
    },
    async updateSession(id, session) {
      // Update only: a concurrent logout must never be undone by refresh upsert.
      return (
        (await orm.em.fork().nativeUpdate(
          AuthSession,
          { id, expiresAt: { $gt: new Date() } },
          {
            encryptedTokens: session.encryptedTokens,
            accessExpiresAt: session.accessExpiresAt,
          },
        )) > 0
      );
    },
    async getSession(id) {
      const record = await orm.em.fork().findOne(AuthSession, id, { populate: ['user'] });
      if (!record || record.user.cognitoUserPoolId !== poolId) return null;
      return {
        user: appUser(record.user),
        encryptedTokens: record.encryptedTokens,
        accessExpiresAt: record.accessExpiresAt,
        expiresAt: record.expiresAt,
      };
    },
    async deleteSession(id) {
      await orm.em.fork().nativeDelete(AuthSession, id);
    },
    async deleteSessionsForEmail(email) {
      const em = orm.em.fork();
      const user = await em.findOne(User, { cognitoUserPoolId: poolId, email });
      if (user) await em.nativeDelete(AuthSession, { user: user.id });
    },
  };
}
