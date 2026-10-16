import { buildApp } from '../../app';
import {
  studentWorkFixture,
  classId,
  assignmentId,
  itemId,
  summary,
} from '../../../test/student-work-fixture';
import { sessionId } from '../../../test/auth-fixture';
import { StudentWorkError } from '../../application/student-work/errors';
const operations = [
  { method: 'GET' as const, url: `/api/student/classes/${classId}/assignments` },
  { method: 'GET' as const, url: `/api/student/assignments/${assignmentId}` },
  {
    method: 'PATCH' as const,
    url: `/api/student/assignments/${assignmentId}/attempt`,
    payload: { revision: 0, itemId, answers: [] },
  },
  {
    method: 'POST' as const,
    url: `/api/student/assignments/${assignmentId}/submission`,
    payload: { revision: 0 },
  },
  {
    method: 'GET' as const,
    url: `/api/student/assignments/${assignmentId}/items/${itemId}/solution`,
  },
];
test.each(operations)(
  'blocks anonymous and instructor $method $url before storage',
  async (operation) => {
    const { context, service, headers, studentWork, user } = studentWorkFixture();
    const app = buildApp({ studentWork: context });
    try {
      expect((await app.inject({ ...operation, headers })).statusCode).toBe(401);
      service.authenticate.mockResolvedValue({ ...user, role: 'instructor' });
      expect(
        (
          await app.inject({
            ...operation,
            headers: { ...headers, cookie: `logiclab_session=${sessionId}` },
          })
        ).statusCode,
      ).toBe(403);
      Object.values(studentWork).forEach((method) => expect(method).not.toHaveBeenCalled());
    } finally {
      await app.close();
    }
  },
);
test.each(operations.filter((operation) => operation.method !== 'GET'))(
  'requires origin for $method $url',
  async (operation) => {
    const { context, studentWork } = studentWorkFixture();
    const app = buildApp({ studentWork: context });
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
      Object.values(studentWork).forEach((method) => expect(method).not.toHaveBeenCalled());
    } finally {
      await app.close();
    }
  },
);
test.each([
  ['not_found', 404],
  ['revision_conflict', 409],
  ['submitted', 409],
  ['solution_locked', 403],
  ['invalid_cell', 400],
  ['duplicate_cell', 400],
  ['unsupported_policy', 409],
] as const)('maps %s failures', async (reason, status) => {
  const { context, studentWork, headers } = studentWorkFixture();
  studentWork.save.mockRejectedValue(new StudentWorkError(reason));
  const app = buildApp({ studentWork: context });
  try {
    expect(
      (
        await app.inject({
          ...operations[2]!,
          headers: { ...headers, cookie: `logiclab_session=${sessionId}` },
        })
      ).statusCode,
    ).toBe(status);
  } finally {
    await app.close();
  }
});
test('sanitizes operational errors and paginates published summaries', async () => {
  const { context, studentWork, headers } = studentWorkFixture();
  const app = buildApp({ studentWork: context });
  const authenticated = { ...headers, cookie: `logiclab_session=${sessionId}` };
  try {
    studentWork.list.mockResolvedValue([summary, summary]);
    expect(
      (
        await app.inject({
          method: 'GET',
          url: `/api/student/classes/${classId}/assignments?limit=1`,
          headers: authenticated,
        })
      ).json(),
    ).toEqual({ assignments: [summary], nextOffset: 1 });
    studentWork.list.mockResolvedValue([]);
    expect(
      (await app.inject({ method: 'GET', url: operations[0]!.url, headers: authenticated })).json(),
    ).toEqual({ assignments: [], nextOffset: null });
    studentWork.read.mockRejectedValue(new Error('private token detail'));
    const failure = await app.inject({ ...operations[1]!, headers: authenticated });
    expect(failure.statusCode).toBe(503);
    expect(failure.body).not.toContain('private token');
  } finally {
    await app.close();
  }
});
test('answer saves use their explicit rate limit instead of the ten-mutation default', async () => {
  const { context, headers } = studentWorkFixture();
  const app = buildApp({ studentWork: context });
  try {
    for (let index = 0; index < 12; index++)
      expect(
        (
          await app.inject({
            ...operations[2]!,
            headers: { ...headers, cookie: `logiclab_session=${sessionId}` },
          })
        ).statusCode,
      ).toBe(200);
  } finally {
    await app.close();
  }
});

test('role checks precede malformed IDs and client results are rejected before storage', async () => {
  const { context, service, studentWork, user, headers } = studentWorkFixture();
  const app = buildApp({ studentWork: context });
  const authenticated = { ...headers, cookie: `logiclab_session=${sessionId}` };
  try {
    const invalid = {
      method: 'PATCH' as const,
      url: '/api/student/assignments/not-a-uuid/attempt',
      payload: { revision: 0, itemId, answers: [] },
    };
    expect((await app.inject({ ...invalid, headers })).statusCode).toBe(401);
    service.authenticate.mockResolvedValue({ ...user, role: 'instructor' });
    expect((await app.inject({ ...invalid, headers: authenticated })).statusCode).toBe(403);
    service.authenticate.mockResolvedValue(user);
    expect((await app.inject({ ...invalid, headers: authenticated })).statusCode).toBe(400);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: `/api/student/assignments/${assignmentId}/submission`,
          payload: { revision: 0, result: { score: 100 } },
          headers: authenticated,
        })
      ).statusCode,
    ).toBe(400);
    Object.values(studentWork).forEach((method) => expect(method).not.toHaveBeenCalled());
  } finally {
    await app.close();
  }
});
