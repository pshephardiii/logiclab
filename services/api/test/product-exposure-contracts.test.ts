import {
  ProductExposure,
  productExposureSchema,
  productExposureResponseSchema,
  resolveProductExposure,
} from '@logiclab/contracts/product-exposure';
import { ProductExposure as RootProductExposure } from '@logiclab/contracts';

test('exposure has one shared value set through the package and focused entry', () => {
  expect(RootProductExposure).toBe(ProductExposure);
  expect(productExposureSchema.options).toEqual(['full', 'practice-only']);
  for (const value of Object.values(ProductExposure))
    expect(productExposureResponseSchema.parse({ productExposure: value })).toEqual({
      productExposure: value,
    });
});

test.each(['', 'FULL', 'practice', ' full ', null, false, 1, {}])(
  'invalid explicit configuration never falls back to full: %p',
  (value) => {
    for (const production of [false, true])
      expect(() => resolveProductExposure(value, { production, settingName: 'EXPOSURE' })).toThrow(
        /EXPOSURE/,
      );
  },
);

test('public metadata rejects missing/unknown modes and extra private configuration', () => {
  for (const value of [
    {},
    { productExposure: 'unknown' },
    { productExposure: 'full', token: 'private' },
  ])
    expect(productExposureResponseSchema.safeParse(value).success).toBe(false);
});
