import { test, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { z } from 'zod';
import { requestJson } from './http-client';
import { ResourceApiProvider, createResourceRequest, useResourceApi } from './ResourceApiProvider';
import * as classrooms from './classrooms/api';

afterEach(() => {
  window.history.replaceState(null, '', '/');
  vi.unstubAllGlobals();
});

function mockResponse(payload: unknown = {}) {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => payload });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

test('generic HTTP transport sends its supplied path unchanged even on a demo page', async () => {
  window.history.replaceState(null, '', '/demo/classes');
  const fetch = mockResponse();
  const options = { signal: new AbortController().signal, error: () => new Error('failed') };
  for (const path of [
    '/api/classes',
    '/api/auth/login',
    '/api/demo/session',
    '/api/truth-tables/exercise',
  ]) {
    await requestJson(path, options);
    expect(fetch.mock.lastCall![0]).toBe(path);
  }
});

test('explicit resource scopes keep destinations after browser navigation changes', async () => {
  const fetch = mockResponse();
  const normal = createResourceRequest('normal');
  const demo = createResourceRequest('demo');
  const options = {
    schema: z.object({}),
    signal: new AbortController().signal,
    fallback: 'failed',
  };
  window.history.replaceState(null, '', '/demo/classes');
  await normal('/api/classes?offset=20', options);
  expect(fetch.mock.lastCall![0]).toBe('/api/classes?offset=20');
  window.history.replaceState(null, '', '/classes');
  await demo('/api/classes?offset=20', options);
  expect(fetch.mock.lastCall![0]).toBe('/api/demo/resources/classes?offset=20');
});

test('route provider binds domain clients and retained demo clients do not follow a scope switch', async () => {
  const fetch = mockResponse({ classrooms: [], nextOffset: null });
  const wrapper = ({ children, scope }: { children: ReactNode; scope: 'normal' | 'demo' }) =>
    createElement(ResourceApiProvider, { scope, children });
  // Mount independent route trees, then retain the demo callback across their lifetimes.
  const demo = renderHook(() => useResourceApi(classrooms), {
    wrapper: ({ children }) => wrapper({ children, scope: 'demo' }),
  });
  const retained = demo.result.current.listClassrooms;
  await retained(new AbortController().signal);
  expect(fetch.mock.lastCall![0]).toBe('/api/demo/resources/classes?offset=0');
  demo.unmount();
  const normal = renderHook(() => useResourceApi(classrooms), {
    wrapper: ({ children }) => wrapper({ children, scope: 'normal' }),
  });
  await normal.result.current.listClassrooms(new AbortController().signal);
  expect(fetch.mock.lastCall![0]).toBe('/api/classes?offset=0');
  await retained(new AbortController().signal, 20);
  expect(fetch.mock.lastCall![0]).toBe('/api/demo/resources/classes?offset=20');
  normal.unmount();
});
