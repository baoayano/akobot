/**
 * Format a number with comma as thousand separators.
 * Examples:
 *  - formatNumber(1234567) => "1,234,567"
 *  - formatNumber(1234.5, 2) => "1,234.50"
 */
export function formatNumber(value: number | bigint | string, decimals?: number): string {
  if (typeof value === 'bigint') {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  const num = typeof value === 'string' ? Number(value) : Number(value);
  if (Number.isNaN(num)) return String(value);

  if (typeof decimals === 'number') {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  return num.toLocaleString('en-US');
}

export default formatNumber;
