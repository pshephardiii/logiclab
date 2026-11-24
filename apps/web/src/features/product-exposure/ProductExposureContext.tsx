import { createContext, useContext } from 'react';
import { ProductExposure } from '@logiclab/contracts/product-exposure';

/** App composition provides the verified mode; isolated full-product views keep their default. */
export const ProductExposureContext = createContext<ProductExposure>(ProductExposure.Full);

export function useProductExposure() {
  return useContext(ProductExposureContext);
}
