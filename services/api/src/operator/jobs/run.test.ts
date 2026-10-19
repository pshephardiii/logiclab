import type { createDatabase } from '@logiclab/db' with { 'resolution-mode': 'import' };
import { runJobsCommand } from './run';
import { createJobRuntime } from '../../bootstrap/jobs';
import { createJobOperatorStore } from '../../persistence/jobs/operator-store';

jest.mock('../../bootstrap/jobs', () => ({ createJobRuntime: jest.fn() }));
jest.mock('../../persistence/jobs/operator-store', () => {
  const actual = jest.requireActual('../../persistence/jobs/operator-store');
  return { ...actual, createJobOperatorStore: jest.fn() };
});
function fixture() {
  const close = jest.fn(async () => {});
  const connect = jest.fn(
    async () => ({ close }) as unknown as Awaited<ReturnType<typeof createDatabase>>,
  );
  return { close, connect, io: { out: jest.fn(), error: jest.fn() } };
}
beforeEach(() => {
  jest.resetAllMocks();
});

test('help and invalid arguments never connect to a database', async () => {
  const { connect, io } = fixture();
  expect(await runJobsCommand([], {}, io, connect)).toBe(0);
  expect(await runJobsCommand(['bad-command'], {}, io, connect)).toBe(1);
  expect(connect).not.toHaveBeenCalled();
  expect(io.out).toHaveBeenCalledWith(expect.stringContaining('scheduler'));
});
test('missing database setting and failed connection are safe errors', async () => {
  const { connect, io } = fixture();
  expect(await runJobsCommand(['list'], {}, io, connect)).toBe(1);
  expect(connect).not.toHaveBeenCalled();
  connect.mockRejectedValueOnce(new Error('postgresql://password-sensitive'));
  expect(await runJobsCommand(['list'], { DATABASE_URL: 'private' }, io, connect)).toBe(1);
  expect(JSON.stringify(io.error.mock.calls)).not.toContain('password-sensitive');
});
test('inspect command closes resources and emits only the selected result', async () => {
  const { connect, close, io } = fixture();
  jest.mocked(createJobRuntime).mockResolvedValue({} as never);
  jest.mocked(createJobOperatorStore).mockResolvedValue({
    inspect: jest.fn(async () => ({ job: { id: 'example' }, runs: [] })),
  } as never);
  expect(
    await runJobsCommand(
      ['inspect', 'b1111111-1111-4111-8111-111111111111'],
      { DATABASE_URL: 'private' },
      io,
      connect,
    ),
  ).toBe(0);
  expect(close).toHaveBeenCalledWith(true);
  expect(io.out).toHaveBeenCalledWith(expect.stringContaining('example'));
});
test('initialization and shutdown failures close connections and fail safely', async () => {
  const { connect, close, io } = fixture();
  jest.mocked(createJobRuntime).mockRejectedValueOnce(new Error('private-signing-secret'));
  expect(await runJobsCommand(['list'], { DATABASE_URL: 'private' }, io, connect)).toBe(1);
  expect(close).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(io.error.mock.calls)).not.toContain('private-signing-secret');
  jest.mocked(createJobRuntime).mockResolvedValue({} as never);
  jest
    .mocked(createJobOperatorStore)
    .mockResolvedValue({ jobs: jest.fn(async () => ({ jobs: [], nextOffset: null })) } as never);
  close.mockRejectedValueOnce(new Error('private shutdown detail'));
  expect(await runJobsCommand(['list'], { DATABASE_URL: 'private' }, io, connect)).toBe(1);
  expect(io.error).toHaveBeenCalledWith('Jobs command database shutdown failed.');
});
