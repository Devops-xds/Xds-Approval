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
