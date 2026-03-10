import { BillingPaymentMethod, BillingPlan, PLAN_PRICES_VND } from '@/lib/server/billing';

interface CreatePaymentInput {
  orderId: string;
  amountVnd: number;
  plan: BillingPlan;
  method: BillingPaymentMethod;
}

interface PaymentInitResult {
  provider: string;
  checkoutUrl?: string;
  qrImageUrl?: string;
  transferContent?: string;
  providerOrderId?: string;
}

const buildVietQrPayment = ({ orderId, amountVnd }: CreatePaymentInput): PaymentInitResult => {
  const bankBin = process.env.VIETQR_BANK_BIN || '970436';
  const accountNo = process.env.VIETQR_ACCOUNT_NO || '';
  const accountName = process.env.VIETQR_ACCOUNT_NAME || 'TIM NTN YOUTUBE';
  const transferContent = `NTN-${orderId}`;
  const qrImageUrl =
    accountNo
      ? `https://img.vietqr.io/image/${bankBin}-${accountNo}-compact2.png?amount=${amountVnd}&addInfo=${encodeURIComponent(
          transferContent
        )}&accountName=${encodeURIComponent(accountName)}`
      : undefined;

  return {
    provider: 'VIETQR',
    qrImageUrl,
    transferContent,
    providerOrderId: orderId,
  };
};

export const createPaymentSession = async (input: CreatePaymentInput) => {
  if (input.amountVnd !== PLAN_PRICES_VND[input.plan]) {
    throw new Error('Số tiền thanh toán không hợp lệ.');
  }
  return buildVietQrPayment(input);
};
