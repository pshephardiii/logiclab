import { buildApp } from '../src/app';
import {
  ProductExposure,
  productExposureResponseSchema,
} from '@logiclab/contracts/product-exposure';
import type { HTTPMethods } from 'fastify';
import { classroomFixture } from './classroom-fixture';
import { sessionId } from './auth-fixture';

test.each([undefined, ProductExposure.Full])(
  'full exposure preserves resource registration: %s',
  async (productExposure) => {
    const { context } = classroomFixture();
    const app = buildApp({ productExposure, auth: context, classroom: context });
    try {
      const metadata = await app.inject('/api/product-exposure');
      expect(metadata.statusCode).toBe(200);
      expect(productExposureResponseSchema.parse(metadata.json())).toEqual({
        productExposure: ProductExposure.Full,
      });
      expect(metadata.headers['cache-control']).toBe('no-store');
      for (const url of ['/api/auth/session', '/api/classes'])
        expect(
          (
            await app.inject({
              method: 'GET',
              url,
              headers: { cookie: `logiclab_session=${sessionId}` },
            })
          ).statusCode,
        ).toBe(200);
    } finally {
      await app.close();
    }
  },
);

test('practice-only registers only public practice/operational routes even when resource dependencies are supplied', async () => {
  const accessed = jest.fn(() => {
    throw new Error('Full product dependency accessed');
  });
  // Deliberately unusable contexts prove restricted composition never registers their plugins.
  const contexts = Object.fromEntries(
    ['auth', 'classroom', 'problem', 'assignment', 'studentWork', 'billing', 'demo'].map((name) => [
      name,
      new Proxy({}, { get: accessed }),
    ]),
  ) as Omit<NonNullable<Parameters<typeof buildApp>[0]>, 'productExposure' | 'logger'>;
  const app = buildApp({ ...contexts, productExposure: ProductExposure.PracticeOnly });
  try {
    expect((await app.inject('/api/health')).statusCode).toBe(200);
    const metadata = await app.inject('/api/product-exposure');
    expect(productExposureResponseSchema.parse(metadata.json())).toEqual({
      productExposure: ProductExposure.PracticeOnly,
    });
    expect(metadata.headers['cache-control']).toBe('no-store');

    for (const endpoint of ['exercise', 'check', 'solution']) {
      const response = await app.inject({
        method: 'POST',
        url: `/api/truth-tables/${endpoint}`,
        payload: { formula: 'P', ...(endpoint === 'check' ? { answers: [] } : {}) },
      });
      expect(response.statusCode).toBe(200);
    }
    const invalid = await app.inject({
      method: 'POST',
      url: '/api/truth-tables/exercise',
      payload: { formula: 'P & Q -> R' },
    });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json().error.code).toBe('GROUPING_REQUIRED');
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/truth-tables/exercise',
          payload: { formula: 'P'.repeat(257) },
        })
      ).statusCode,
    ).toBe(400);

    const privatePaths = [
      '/api/auth/session',
      '/api/auth/login',
      '/api/classes',
      '/api/enrollments',
      '/api/problems',
      '/api/assignments',
      '/api/classes/example/assignments',
      '/api/assignments/example',
      '/api/student/classes/example/assignments',
      '/api/billing/plans',
      '/api/billing/webhook',
      '/api/demo/start',
      '/api/demo/session',
      '/api/demo/classes',
      '/api/demo/problems',
      '/api/demo/assignments',
      '/api/demo/student/classes/example/assignments',
      '/api/demo/billing/plans',
    ];
    for (const url of privatePaths)
      for (const method of ['GET', 'POST', 'PATCH', 'DELETE'] as HTTPMethods[]) {
        const response = await app.inject({
          method,
          url,
          headers: {
            cookie: `logiclab_session=${sessionId}; logiclab_demo=retained`,
            authorization: 'Bearer ignored',
          },
        });
        expect(response.statusCode).toBe(404);
        expect(response.headers['set-cookie']).toBeUndefined();
      }
    expect(accessed).not.toHaveBeenCalled();
  } finally {
    await app.close();
  }
});
