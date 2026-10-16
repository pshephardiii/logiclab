/** Currency minor units depend on the currency (USD cents, JPY units, KWD fils). */
export function formatPrice(amountMinor: number, currency: string) {
  const format = new Intl.NumberFormat(undefined, { style: 'currency', currency });
  return format.format(amountMinor / 10 ** (format.resolvedOptions().maximumFractionDigits ?? 2));
}
