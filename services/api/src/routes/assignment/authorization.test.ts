import { buildApp } from '../../app';
import {
  assignmentFixture,
  assignment,
  assignmentSummary,
  classId,
} from '../../../test/assignment-fixture';
import { sessionId } from '../../../test/auth-fixture';
import { AssignmentOperationError } from '../../application/assignment/errors';

const operations = [
  {
    method: 'POST' as const,
    url: `/api/classes/${classId}/assignments`,
    payload: { title: 'Work' },
  },
  { method: 'GET' as const, url: `/api/classes/${classId}/assignments` },
  { method: 'GET' as const, url: `/api/assignments/${assignment.id}` },
  {
    method: 'PATCH' as const,
    url: `/api/assignments/${assignment.id}`,
    payload: { title: 'Edit' },
  },
  ...['publish', 'archive', 'restore'].map((action) => ({
    method: 'POST' as const,
    url: `/api/assignments/${assignment.id}/${action}`,
    payload: {},
  })),
];
test.each(operations)(
  'rejects anonymous and student $method $url before storage access',
  async (operation) => {
    const { context, headers, service, assignments, user } = assignmentFixture();
    const app = buildApp({ assignment: context });
    try {
      expect((await app.inject({ ...operation, headers })).statusCode).toBe(401);
      service.authenticate.mockResolvedValue({ ...user, role: 'student' });
      expect(
        (
          await app.inject({
            ...operation,
            headers: { ...headers, cookie: `logiclab_session=${sessionId}` },
          })
        ).statusCode,
      ).toBe(403);
      Object.values(assignments).forEach((method) => expect(method).not.toHaveBeenCalled());
    } finally {
      await app.close();
    }
  },
);

test.each(operations.filter((operation) => operation.method !== 'GET'))(
  'requires exact origin for $method $url',
  async (operation) => {
    const { context, assignments } = assignmentFixture();
    const app = buildApp({ assignment: context });
    try {
      expect(
        (
          await app.inject({
            ...operation,
            headers: {
              cookie: `logiclab_session=${sessionId}`,
              origin: 'https://untrusted.example',
            },
          })
        ).statusCode,
      ).toBe(403);
      Object.values(assignments).forEach((method) => expect(method).not.toHaveBeenCalled());
    } finally {
      await app.close();
    }
  },
);

test.each([
  ['not_found', 404],
  ['version_not_found', 404],
  ['published', 409],
  ['archived', 409],
  ['empty', 409],
] as const)('maps domain %s without raw errors', async (reason, status) => {
  const { context, headers, assignments } = assignmentFixture();
  assignments.publish.mockRejectedValue(new AssignmentOperationError(reason));
  const app = buildApp({ assignment: context });
  try {
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/assignments/${assignment.id}/publish`,
          payload: {},
          headers: { ...headers, cookie: `logiclab_session=${sessionId}` },
        })
      ).statusCode,
    ).toBe(status);
  } finally {
    await app.close();
  }
});

test('operational failures are sanitized and list pagination uses an extra row', async () => {
  const { context, headers, assignments } = assignmentFixture();
  const app = buildApp({ assignment: context });
  const authenticated = { ...headers, cookie: `logiclab_session=${sessionId}` };
  try {
    assignments.list.mockResolvedValue([assignmentSummary, assignmentSummary]);
    const page = await app.inject({
      method: 'GET',
      url: `/api/classes/${classId}/assignments?limit=1&offset=4&archive=all`,
      headers: authenticated,
    });
    expect(page.json()).toEqual({ assignments: [assignmentSummary], nextOffset: 5 });
    assignments.list.mockResolvedValue([]);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: `/api/classes/${classId}/assignments`,
          headers: authenticated,
        })
      ).json(),
    ).toEqual({ assignments: [], nextOffset: null });
    assignments.findOwned.mockRejectedValue(new Error('private database password'));
    const failure = await app.inject({
      method: 'GET',
      url: `/api/assignments/${assignment.id}`,
      headers: authenticated,
    });
    expect(failure.statusCode).toBe(503);
    expect(failure.body).not.toContain('private database password');
  } finally {
    await app.close();
  }
});

test('authorization precedes validation and request boundaries reject unsupported fields', async () => {
  const { context, headers, service, assignments, user } = assignmentFixture();
  const app = buildApp({ assignment: context });
  const authenticated = { ...headers, cookie: `logiclab_session=${sessionId}` };
  try {
    const invalid = {
      method: 'PATCH' as const,
      url: '/api/assignments/not-a-uuid',
      payload: { ownerId: 'spoof' },
    };
    expect((await app.inject({ ...invalid, headers })).statusCode).toBe(401);
    service.authenticate.mockResolvedValue({ ...user, role: 'student' });
    expect((await app.inject({ ...invalid, headers: authenticated })).statusCode).toBe(403);
    service.authenticate.mockResolvedValue(user);
    expect((await app.inject({ ...invalid, headers: authenticated })).statusCode).toBe(400);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/assignments/${assignment.id}/publish`,
          payload: { solutionAccess: 'after_submission' },
          headers: authenticated,
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: `/api/classes/${classId}/assignments?limit=51`,
          headers: authenticated,
        })
      ).statusCode,
    ).toBe(400);
    Object.values(assignments).forEach((method) => expect(method).not.toHaveBeenCalled());
  } finally {
    await app.close();
  }
});
