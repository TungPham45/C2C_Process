const toNumber = (value: string | number | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatVnd = (value: string | number | null | undefined) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(toNumber(value));

export const formatVndCode = (value: string | number | null | undefined) =>
  `${new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(toNumber(value))} VND`;

export const formatVndCompact = (value: string | number | null | undefined) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(toNumber(value));

export const formatPriceRange = (basePrice: string | number, variants?: any[]) => {
  if (!variants || variants.length === 0) {
    return formatVnd(basePrice);
  }

  const prices = variants
    .map((v) => toNumber(v.price_override || v.price))
    .filter((p) => p > 0);

  if (prices.length === 0) {
    return formatVnd(basePrice);
  }

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  if (minPrice === maxPrice) {
    return formatVnd(minPrice);
  }

  return `${formatVnd(minPrice)} - ${formatVnd(maxPrice)}`;
};
