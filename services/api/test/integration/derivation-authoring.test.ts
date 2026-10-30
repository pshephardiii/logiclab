import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { derivationDefinitionFixture as definition } from '../derivation-fixture';
import { createProblemStore } from '../../src/persistence/problem/store';
import { createAssignmentStore } from '../../src/persistence/assignment/store';
import { createDemoRuntime } from '../../src/bootstrap/demo';
import { readDemoConfig } from '../../src/config/demo';
import { DerivationPublicationError } from '../../src/application/problem/library-definition';
import { checkDerivationReference } from '../../src/application/problem/derivation-authoring';
import { UnsupportedProblemDefinitionError } from '../../src/application/problem/definition-support';
import type { createDatabase } from '@logiclab/db' with { 'resolution-mode': 'import' };

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error('Use a disposable _test database.');
async function fixture(
  work: (
    orm: Awaited<ReturnType<typeof createDatabase>>,
    db: typeof import('@logiclab/db', { with: { 'resolution-mode': 'import' } }),
  ) => Promise<void>,
) {
  const db = await import('@logiclab/db');
  const schema = `derivation_authoring_${randomUUID().replaceAll('-', '')}`;
  const orm = await db.createDatabase(url!, { schema, snapshotOnMigrate: false });
  try {
    await orm.schema.create();
    await work(orm, db);
  } finally {
    await orm.em.execute(`drop schema if exists "${schema}" cascade`);
    await orm.close(true);
  }
}

test('owner drafts/preview/checked snapshots preserve history and reject stale reference acceptance', async () =>
  fixture(async (orm, db) => {
    const em = orm.em.fork();
    const owner = em.create(db.User, {
      cognitoUserPoolId: 'derivation-authoring',
      cognitoSubject: randomUUID(),
      role: db.UserRole.Instructor,
    });
    const foreign = em.create(db.User, {
      cognitoUserPoolId: 'derivation-authoring',
      cognitoSubject: randomUUID(),
      role: db.UserRole.Instructor,
    });
    em.persist([owner, foreign]);
    await em.flush();
    const store = await createProblemStore(orm);
    const draft = await store.create(owner.id, {
      title: 'Derivation',
      definition: { ...definition(), referenceProof: null },
    });
    assert.equal((await store.previewReference(owner.id, draft.id))!.check.status, 'missing');
    await assert.rejects(
      store.publish(owner.id, draft.id),
      (error) => error instanceof DerivationPublicationError && error.code === 'missing_reference',
    );
    assert.equal(await em.count(db.ProblemVersion, { problem: draft.id }), 0);
    const valid = await store.update(owner.id, draft.id, { definition: definition() });
    assert.equal(valid.status, 'updated');
    const preview = await store.previewReference(owner.id, draft.id);
    assert.equal(preview!.problemId, draft.id);
    assert.deepEqual(preview!.check, checkDerivationReference(definition()));
    assert.equal(preview!.updatedAt, (await store.findOwned(owner.id, draft.id))!.updatedAt);
    // A valid preview never authorizes later changed saved data.
    await store.update(owner.id, draft.id, { definition: { ...definition(), rules: [] } });
    await assert.rejects(
      store.publish(owner.id, draft.id),
      (error) => error instanceof DerivationPublicationError && error.code === 'rejected_reference',
    );
    assert.equal(await em.count(db.ProblemVersion, { problem: draft.id }), 0);
    await store.update(owner.id, draft.id, { definition: definition() });
    const first = await store.publish(owner.id, draft.id);
    assert.equal(first.status, 'published');
    if (first.status !== 'published') throw new Error('Expected publication');
    assert.deepEqual(first.version.definition, definition());
    await store.update(owner.id, draft.id, {
      title: 'Changed draft',
      definition: {
        ...definition(),
        explanation: 'Different private explanation',
        referenceProof: null,
      },
    });
    assert.deepEqual((await store.findVersion(owner.id, draft.id, 1))!.definition, definition());
    assert.equal((await store.listVersions(owner.id, draft.id, 20, 0))!.length, 1);
    await store.setArchived(owner.id, draft.id, true);
    assert.equal((await store.publish(owner.id, draft.id)).status, 'archived');
    assert.equal(
      (await store.update(owner.id, draft.id, { title: 'Forbidden' })).status,
      'archived',
    );
    assert.equal((await store.previewReference(owner.id, draft.id))!.check.status, 'missing');
    assert.equal((await store.list(owner.id, 20, 0, 'active')).length, 0);
    assert.equal((await store.list(owner.id, 20, 0, 'archived')).length, 1);
    await store.setArchived(owner.id, draft.id, false);
    assert.deepEqual((await store.findVersion(owner.id, draft.id, 1))!.definition, definition());
    assert.equal(await store.findOwned(foreign.id, draft.id), null);
    assert.equal(await store.previewReference(foreign.id, draft.id), null);
    assert.equal(await store.findVersion(foreign.id, draft.id, 1), null);
    assert.equal(await store.listVersions(foreign.id, draft.id, 20, 0), null);
    assert.equal((await store.publish(foreign.id, draft.id)).status, 'not_found');
    assert.equal(
      (await store.update(foreign.id, draft.id, { title: 'Foreign' })).status,
      'not_found',
    );
    assert.equal(await store.setArchived(foreign.id, draft.id, true), null);
  }));

test('invalid owner edits roll back metadata and derivation snapshots remain excluded from assignments', async () =>
  fixture(async (orm, db) => {
    const em = orm.em.fork();
    const owner = em.create(db.User, {
      cognitoUserPoolId: 'derivation-authoring',
      cognitoSubject: randomUUID(),
      role: db.UserRole.Instructor,
    });
    const classroom = em.create(db.Classroom, { owner, name: 'Guarded class' });
    em.persist([owner, classroom]);
    await em.flush();
    const store = await createProblemStore(orm);
    const draft = await store.create(owner.id, { title: 'Keep saved', definition: definition() });
    const before = await store.findOwned(owner.id, draft.id);
    await assert.rejects(
      store.update(owner.id, draft.id, {
        title: 'Must roll back',
        definition: { ...definition(), rules: [{ id: 'custom_rule', label: 'MP' }] },
      }),
    );
    assert.deepEqual(await store.findOwned(owner.id, draft.id), before);
    const published = await store.publish(owner.id, draft.id);
    if (published.status !== 'published') throw new Error('Expected publication');
    const assignments = await createAssignmentStore(orm);
    await assert.rejects(
      assignments.create(owner.id, classroom.id, {
        title: 'Blocked assignment',
        problemVersionIds: [published.version.id],
        assessmentMode: 'graded',
        feedbackTiming: 'on_submission',
        solutionAccess: 'never',
      }),
      UnsupportedProblemDefinitionError,
    );
    assert.equal(await em.fork().count(db.Assignment, { classroom: classroom.id }), 0);
  }));

test('concurrent publication numbers snapshots atomically and edit races never publish rejected references', async () =>
  fixture(async (orm, db) => {
    const em = orm.em.fork();
    const owner = em.create(db.User, {
      cognitoUserPoolId: 'derivation-concurrency',
      cognitoSubject: randomUUID(),
      role: db.UserRole.Instructor,
    });
    em.persist(owner);
    await em.flush();
    const store = await createProblemStore(orm);
    const draft = await store.create(owner.id, {
      title: 'Concurrent derivation',
      definition: definition(),
    });
    const initial = await Promise.all([
      store.publish(owner.id, draft.id),
      store.publish(owner.id, draft.id),
    ]);
    assert.deepEqual(
      initial.map((result) => (result.status === 'published' ? result.version.version : 0)).sort(),
      [1, 2],
    );
    const [publication, edit] = await Promise.allSettled([
      store.publish(owner.id, draft.id),
      store.update(owner.id, draft.id, { definition: { ...definition(), conclusion: 'Q' } }),
    ]);
    assert.equal(edit.status, 'fulfilled');
    if (edit.status === 'fulfilled') assert.equal(edit.value.status, 'updated');
    if (publication.status === 'rejected')
      assert(publication.reason instanceof DerivationPublicationError);
    else assert.equal(publication.value.status, 'published');
    const versions = await store.listVersions(owner.id, draft.id, 20, 0);
    for (const version of versions!) {
      const check = checkDerivationReference(version.definition);
      assert.equal(check.status, 'checked');
      if (check.status === 'checked') assert.equal(check.report.status, 'accepted');
    }
    const count = versions!.length;
    await assert.rejects(store.publish(owner.id, draft.id), DerivationPublicationError);
    assert.equal((await store.listVersions(owner.id, draft.id, 20, 0))!.length, count);
    await store.update(owner.id, draft.id, { definition: definition() });
    const next = await store.publish(owner.id, draft.id);
    assert.equal(next.status, 'published');
    if (next.status === 'published') assert.equal(next.version.version, count + 1);
  }));

test('demo owner authoring joins workspace rollback and keeps cross-visitor references private', async () =>
  fixture(async (orm, db) => {
    const runtime = await createDemoRuntime(
      orm,
      readDemoConfig({
        DEMO_ENABLED: 'true',
        APP_ORIGIN: 'http://localhost:5173',
        DEMO_MAX_WORKSPACES: '5',
      })!,
    );
    const first = await runtime.workspaces.provision();
    const second = await runtime.workspaces.provision();
    const one = await runtime.sessions.issue(first.workspaceId, 'instructor');
    const two = await runtime.sessions.issue(second.workspaceId, 'instructor');
    const draft = await runtime.run(one.sessionId, true, (actor) =>
      runtime.context.problems.create(actor.id, {
        title: 'Demo derivation',
        definition: definition(),
      }),
    );
    const preview = await runtime.run(one.sessionId, false, (actor) =>
      runtime.context.problems.previewReference(actor.id, draft.id),
    );
    assert.equal(preview!.check.status, 'checked');
    assert.equal(
      await runtime.run(two.sessionId, false, (actor) =>
        runtime.context.problems.previewReference(actor.id, draft.id),
      ),
      null,
    );
    assert.equal(
      (
        await runtime.run(two.sessionId, true, (actor) =>
          runtime.context.problems.publish(actor.id, draft.id),
        )
      ).status,
      'not_found',
    );
    await assert.rejects(
      runtime.run(one.sessionId, true, async (actor) => {
        const created = await runtime.context.problems.create(actor.id, {
          title: 'Must roll back demo draft',
          definition: { ...definition(), referenceProof: null },
        });
        await runtime.context.problems.publish(actor.id, created.id);
      }),
      DerivationPublicationError,
    );
    assert.equal(await orm.em.fork().count(db.Problem, { title: 'Must roll back demo draft' }), 0);
    const published = await runtime.run(one.sessionId, true, (actor) =>
      runtime.context.problems.publish(actor.id, draft.id),
    );
    assert.equal(published.status, 'published');
  }));
