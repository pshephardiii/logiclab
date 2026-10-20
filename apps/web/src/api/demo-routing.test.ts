import { test, expect, vi, afterEach } from 'vitest';
import { requestJson } from './http-client';

afterEach(() => {
  window.history.replaceState(null, '', '/');
  vi.unstubAllGlobals();
});
test('demo pages scope resource requests without redirecting normal account or lifecycle requests', async () => {
  window.history.replaceState(null, '', '/demo/classes');
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
  vi.stubGlobal('fetch', fetch);
  const options = { signal: new AbortController().signal, error: () => new Error('failed') };
  await requestJson('/api/classes?limit=20', options);
  expect(fetch.mock.calls[0]![0]).toBe('/api/demo/resources/classes?limit=20');
  await requestJson('/api/auth/login', options);
  expect(fetch.mock.calls[1]![0]).toBe('/api/auth/login');
  await requestJson('/api/demo/session', options);
  expect(fetch.mock.calls[2]![0]).toBe('/api/demo/session');
  window.history.replaceState(null, '', '/classes');
  await requestJson('/api/classes', options);
  expect(fetch.mock.calls[3]![0]).toBe('/api/classes');
});
