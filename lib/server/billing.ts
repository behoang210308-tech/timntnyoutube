export type BillingPlan = 'TEST' | 'BASIC' | 'STANDARD' | 'PRO' | 'PREMIUM';
export type BillingPaymentMethod = 'VIETQR';

export const PLAN_PRICES_VND: Record<BillingPlan, number> = {
  TEST: 21000,
  BASIC: 150000,
  STANDARD: 450000,
  PRO: 750000,
  PREMIUM: 1200000,
};

export const AFFILIATE_COMMISSION_RATE_BY_PLAN: Record<BillingPlan, number> = {
  TEST: 0.15,
  BASIC: 0.15,
  STANDARD: 0.15,
  PRO: 0.2,
  PREMIUM: 0.25,
};

export const PAYMENT_METHODS: BillingPaymentMethod[] = ['VIETQR'];

export const isPlanValue = (value: string): value is BillingPlan =>
  ['TEST', 'BASIC', 'STANDARD', 'PRO', 'PREMIUM'].includes(value);

export const isPaymentMethodValue = (value: string): value is BillingPaymentMethod =>
  PAYMENT_METHODS.includes(value as BillingPaymentMethod);
