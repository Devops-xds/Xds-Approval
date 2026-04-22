export type PaymentType = 'One-off' | 'Recurring';
export type PaymentTypeValue = PaymentType | 'One month';

export const getPaymentTypeLabel = (paymentType?: string | null) => {
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
