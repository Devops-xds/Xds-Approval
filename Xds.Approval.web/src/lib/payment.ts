export type PaymentType = 'Goods' | 'Service' | 'Residence' | 'Crossboarder';
export type PaymentTypeValue = PaymentType | 'One-off' | 'Recurring' | 'One month';

export interface TaxProfile {
  label: string;
  vatRate: number;
  whtRate: number;
}

const DEFAULT_VAT_RATE = 0.15;
const WHT_THRESHOLD_AMOUNT = 2000;

export const getPaymentTypeOptions = (): PaymentType[] => ['Goods', 'Service', 'Residence', 'Crossboarder'];

export const getPaymentTypeLabel = (paymentType?: string | null) => {
  const normalized = paymentType?.trim().toLowerCase();

  if (normalized === 'goods') return 'Goods';
  if (normalized === 'service') return 'Service';
  if (normalized === 'residence') return 'Residence';
  if (normalized === 'crossboarder' || normalized === 'cross border' || normalized === 'crossborder') return 'Crossboarder';

  if (paymentType === 'One month') {
    return 'One-off';
  }

  if (paymentType === 'One off' || paymentType === 'Once-off') {
    return 'One-off';
  }

  if (paymentType === 'one-off' || paymentType === 'one off' || paymentType === 'once off' || paymentType === 'once-off') {
    return 'One-off';
  }

  return paymentType || 'N/A';
};

export const getTaxProfile = (paymentType?: string | null): TaxProfile => {
  const normalized = getPaymentTypeLabel(paymentType).toLowerCase();

  switch (normalized) {
    case 'goods':
      return { label: 'Goods', vatRate: DEFAULT_VAT_RATE, whtRate: 0.03 };
    case 'service':
      return { label: 'Service', vatRate: DEFAULT_VAT_RATE, whtRate: 0.05 };
    case 'residence':
      return { label: 'Residence', vatRate: DEFAULT_VAT_RATE, whtRate: 0.1 };
    case 'crossboarder':
      return { label: 'Crossboarder', vatRate: DEFAULT_VAT_RATE, whtRate: 0.2 };
    default:
      return { label: getPaymentTypeLabel(paymentType), vatRate: DEFAULT_VAT_RATE, whtRate: 0 };
  }
};

export const getTaxBreakdown = (amount: number, paymentType?: string | null) => {
  const baseProfile = getTaxProfile(paymentType);
  const profile = {
    ...baseProfile,
    whtRate: amount >= WHT_THRESHOLD_AMOUNT ? baseProfile.whtRate : 0,
  };
  const vatAmount = amount * profile.vatRate;
  const whtAmount = amount * profile.whtRate;
  const totalTaxAmount = vatAmount + whtAmount;

  return {
    ...profile,
    vatAmount,
    whtAmount,
    totalTaxAmount,
    totalAmountIncludingTaxes: amount + totalTaxAmount,
  };
};

export const getCurrencySymbol = (currency?: string | null) => {
  switch (currency) {
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'GHS':
    default:
      return '₵';
  }
};
