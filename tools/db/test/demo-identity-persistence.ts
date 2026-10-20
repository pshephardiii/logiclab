import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DemoWorkspace,
  User,
  UserRole,
  UserIdentityProvider,
  DemoSession,
  type createDatabase,
} from '../src/index.ts';

export function registerDemoIdentityPersistenceTests(
  orm: Awaited<ReturnType<typeof createDatabase>>,
) {
  const start = new Date('2026-10-20T12:00:00Z');
  const cases = [
    {
      name: 'demo user without workspace',
      target: 'user',
      changes: { demo_workspace_id: null },
      constraint: 'users_identity_check',
    },
    {
      name: 'demo user with Cognito subject',
      target: 'user',
      changes: { cognito_subject: 'fake' },
      constraint: 'users_identity_check',
    },
    {
      name: 'demo user with email',
      target: 'user',
      changes: { email: 'demo@example.invalid' },
      constraint: 'users_identity_check',
    },
    {
      name: 'demo user changed to Cognito',
      target: 'user',
      changes: { identity_provider: 'cognito' },
      constraint: 'users_identity_check',
    },
    {
      name: 'unsupported identity provider',
      target: 'user',
      changes: { identity_provider: 'unknown' },
      constraint: 'users_identity_check',
    },
    {
      name: 'malformed session hash',
      target: 'session',
      changes: { id: 'not-a-hash' },
      constraint: 'demo_sessions_hash_check',
    },
    {
      name: 'invalid session generation',
      target: 'session',
      changes: { generation: 0 },
      constraint: 'demo_sessions_generation_check',
    },
    {
      name: 'invalid selected role',
      target: 'session',
      changes: { selected_role: 'admin' },
      constraint: 'demo_sessions_role_check',
    },
  ];
  for (const invalid of cases)
    test(`demo identity persistence rejects ${invalid.name}`, async () => {
      const em = orm.em.fork();
      await em.begin();
      try {
        const workspace = em.create(DemoWorkspace, {
          templateVersion: 1,
          createdAt: start,
          lastActivityAt: start,
          idleExpiresAt: new Date(start.getTime() + 60000),
          expiresAt: new Date(start.getTime() + 120000),
        });
        const user = em.create(User, {
          identityProvider: UserIdentityProvider.Demo,
          demoWorkspace: workspace,
          role: UserRole.Student,
        });
        const session = em.create(DemoSession, {
          id: 'a'.repeat(64),
          workspace,
          generation: 1,
          selectedRole: UserRole.Student,
          createdAt: start,
        });
        em.persist([workspace, user, session]);
        await em.flush();
        const [column, value] = Object.entries(invalid.changes)[0]!;
        await assert.rejects(
          em.execute(
            `
              update ${invalid.target === 'user' ? 'users' : 'demo_sessions'}
              set ${column} = ?
              where id = ?
            `,
            [value, invalid.target === 'user' ? user.id : session.id],
          ),
          new RegExp(invalid.constraint),
        );
      } finally {
        await em.rollback();
      }
    });
  test('demo users retain workspace deletion protection', async () => {
    const em = orm.em.fork();
    await em.begin();
    try {
      const workspace = em.create(DemoWorkspace, {
        templateVersion: 1,
        createdAt: start,
        lastActivityAt: start,
        idleExpiresAt: new Date(start.getTime() + 60000),
        expiresAt: new Date(start.getTime() + 120000),
      });
      em.persist(
        em.create(User, {
          identityProvider: UserIdentityProvider.Demo,
          demoWorkspace: workspace,
          role: UserRole.Student,
        }),
      );
      await em.flush();
      await assert.rejects(
        em.nativeDelete(DemoWorkspace, workspace.id),
        /users_demo_workspace_id_fkey/,
      );
    } finally {
      await em.rollback();
    }
  });
  test('demo workspace cannot contain two users for the same role', async () => {
    const em = orm.em.fork();
    await em.begin();
    try {
      const workspace = em.create(DemoWorkspace, {
        templateVersion: 1,
        createdAt: start,
        lastActivityAt: start,
        idleExpiresAt: new Date(start.getTime() + 60000),
        expiresAt: new Date(start.getTime() + 120000),
      });
      for (let i = 0; i < 2; i++)
        em.persist(
          em.create(User, {
            identityProvider: UserIdentityProvider.Demo,
            demoWorkspace: workspace,
            role: UserRole.Instructor,
          }),
        );
      await assert.rejects(em.flush(), /users_demo_workspace_role_unique/);
    } finally {
      await em.rollback();
    }
  });
}
