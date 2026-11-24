import { z } from 'zod';

export const ProductExposure = {
  Full: 'full',
  PracticeOnly: 'practice-only',
} as const;

export type ProductExposure = (typeof ProductExposure)[keyof typeof ProductExposure];

export const productExposureSchema = z.enum(ProductExposure);

/** Public deployment metadata only; never include credentials or feature-service configuration. */
export const productExposureResponseSchema = z.strictObject({
  productExposure: productExposureSchema,
});

export type ProductExposureResponse = z.infer<typeof productExposureResponseSchema>;

/** A missing local choice defaults to full; production must make an explicit valid choice. */
export function resolveProductExposure(
  value: unknown,
  { production, settingName }: { production: boolean; settingName: string },
): ProductExposure {
  if (value === undefined && !production) return ProductExposure.Full;

  const parsed = productExposureSchema.safeParse(value);
  if (!parsed.success)
    throw new Error(
      `Invalid product exposure configuration: ${settingName} must ${production ? 'be explicitly set to' : 'be'} full or practice-only.`,
    );

  return parsed.data;
}
