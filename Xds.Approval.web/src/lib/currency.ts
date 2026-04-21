const DEFAULT_CURRENCY = 'GHS';

export const normalizeCurrencyCode = (currency?: string | null): string => {
  const normalized = currency?.trim().toUpperCase();
  return normalized && /^[A-Z]{3}$/.test(normalized) ? normalized : DEFAULT_CURRENCY;
};

export const formatCurrencyAmount = (amount: number, currency?: string | null): string => {
  const normalizedCurrency = normalizeCurrencyCode(currency);

  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: normalizedCurrency,
      minimumFractionDigits: 0,
    }).format(amount);
  } catch {
    const formattedAmount = new Intl.NumberFormat('en-GB', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);

    return `${normalizedCurrency} ${formattedAmount}`;
  }
};

export const formatCurrencyTotals = (
  items: Array<{ amount: number; currency?: string | null }>,
  fallbackCurrency?: string | null,
): string => {
  const totalsByCurrency = new Map<string, number>();

  items.forEach(({ amount, currency }) => {
    if (!Number.isFinite(amount)) {
      return;
    }

    const normalizedCurrency = normalizeCurrencyCode(currency ?? fallbackCurrency);
    totalsByCurrency.set(normalizedCurrency, (totalsByCurrency.get(normalizedCurrency) ?? 0) + amount);
  });

  if (totalsByCurrency.size === 0) {
    return formatCurrencyAmount(0, fallbackCurrency);
  }

  return Array.from(totalsByCurrency.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, total]) => formatCurrencyAmount(total, currency))
    .join(' • ');
};
