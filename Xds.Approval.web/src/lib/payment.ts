export type PaymentType = 'Once-off' | 'Recurring';
export type PaymentTypeValue = PaymentType | 'One month';

export const getPaymentTypeLabel = (paymentType?: string | null) => {
  if (paymentType === 'One month') {
    return 'Once-off';
  }

  if (paymentType === 'One off') {
    return 'Once-off';
  }

  if (paymentType === 'one-off' || paymentType === 'one off' || paymentType === 'once off' || paymentType === 'once-off') {
    return 'Once-off';
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
