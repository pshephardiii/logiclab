import { buildApp } from '../../../app';
import { AssignmentOperationError } from '../../../application/assignment/errors';
import { assignmentFixture, assignment } from '../../../../test/assignment-fixture';
import { sessionId } from '../../../../test/auth-fixture';

const url = `/api/assignments/${assignment.id}/duplicate`;

test('duplicate authenticates once, returns a draft with no-store and rejects client-supplied copy fields', async () => {
  const { context, assignments, headers, service } = assignmentFixture();
  const app = buildApp({ assignment: context });
  const authenticated = { ...headers, cookie: `logiclab_session=${sessionId}` };
  try {
    const response = await app.inject({ method: 'POST', url, headers: authenticated, payload: {} });
    expect(response.statusCode).toBe(201);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.json().assignment.id).not.toBe(assignment.id);
    expect(service.authenticate).toHaveBeenCalledTimes(1);
    for (const payload of [
      { title: 'Override' },
      { classId: assignment.classId },
      { ownerId: 'spoof' },
      { problemVersionIds: [] },
      { assessmentMode: 'graded' },
    ]) {
      expect(
        (await app.inject({ method: 'POST', url, headers: authenticated, payload })).statusCode,
      ).toBe(400);
    }
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/assignments/invalid/duplicate',
          headers: authenticated,
          payload: {},
        })
      ).statusCode,
    ).toBe(400);
    expect(assignments.duplicate).toHaveBeenCalledTimes(1);
  } finally {
    await app.close();
  }
});

test('missing/foreign sources return 404 and operational errors remain sanitized', async () => {
  const { context, assignments, headers } = assignmentFixture();
  const app = buildApp({ assignment: context });
  const request = {
    method: 'POST' as const,
    url,
    headers: { ...headers, cookie: `logiclab_session=${sessionId}` },
    payload: {},
  };
  try {
    assignments.duplicate.mockRejectedValueOnce(new AssignmentOperationError('not_found'));
    const missing = await app.inject(request);
    expect(missing.statusCode).toBe(404);
    expect(missing.json().error.code).toBe('ASSIGNMENT_NOT_FOUND');
    assignments.duplicate.mockRejectedValueOnce(new Error('private database password'));
    const failed = await app.inject(request);
    expect(failed.statusCode).toBe(503);
    expect(failed.body).not.toContain('private database password');
    expect(failed.headers['cache-control']).toBe('no-store');
  } finally {
    await app.close();
  }
});

test('duplicate inherits the account route rate limit', async () => {
  const { context, assignments, headers } = assignmentFixture();
  const app = buildApp({ assignment: context });
  const request = {
    method: 'POST' as const,
    url,
    headers: { ...headers, cookie: `logiclab_session=${sessionId}` },
    payload: {},
  };
  try {
    for (let count = 0; count < 10; count++)
      expect((await app.inject(request)).statusCode).toBe(201);
    expect((await app.inject(request)).statusCode).toBe(429);
    expect(assignments.duplicate).toHaveBeenCalledTimes(10);
  } finally {
    await app.close();
  }
});
