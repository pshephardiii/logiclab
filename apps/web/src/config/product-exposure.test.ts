import { expect, test } from 'vitest';
import { ProductExposure } from '@logiclab/contracts/product-exposure';
import { readWebProductExposure } from './product-exposure';

test('local serving defaults to the full product', () => {
  expect(readWebProductExposure({}, 'serve')).toBe(ProductExposure.Full);
});

test.each(Object.values(ProductExposure))(
  'both commands accept an explicit %s choice',
  (VITE_PRODUCT_EXPOSURE) => {
    for (const command of ['serve', 'build'] as const)
      expect(readWebProductExposure({ VITE_PRODUCT_EXPOSURE }, command)).toBe(
        VITE_PRODUCT_EXPOSURE,
      );
  },
);

test('every build requires a choice, independently of a Vite mode name', () => {
  expect(() => readWebProductExposure({}, 'build')).toThrow(
    /VITE_PRODUCT_EXPOSURE must be explicitly set/,
  );
});

test.each(['', 'FULL', 'practice', null])(
  'invalid explicit %p mode does not enable the full product',
  (VITE_PRODUCT_EXPOSURE) => {
    for (const command of ['serve', 'build'] as const)
      expect(() => readWebProductExposure({ VITE_PRODUCT_EXPOSURE }, command)).toThrow(
        /VITE_PRODUCT_EXPOSURE/,
      );
  },
);
