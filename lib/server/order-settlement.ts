import { prisma } from '@/lib/server/db';
import { AFFILIATE_COMMISSION_RATE_BY_PLAN, BillingPlan } from '@/lib/server/billing';

export const settlePaidOrder = async (orderId: string, providerTransactionId?: string, callbackPayload?: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { commission: true },
  });
  if (!order) return null;
  if (order.status === 'PAID') return order;

  const plan = (order.plan as BillingPlan) || 'TEST';
  const commissionRate = AFFILIATE_COMMISSION_RATE_BY_PLAN[plan] ?? 0.15;
  const commissionAmount = Math.round(order.amountVnd * commissionRate);

  const settled = await prisma.$transaction(async (tx) => {
    const paidOrder = await tx.order.update({
      where: { id: order.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        providerTransactionId: providerTransactionId || order.providerTransactionId,
        callbackPayload: callbackPayload || order.callbackPayload,
      },
    });

    await tx.user.update({
      where: { id: paidOrder.userId },
      data: { plan: paidOrder.plan },
    });

    if (paidOrder.affiliateReferrerId && paidOrder.affiliateReferrerId !== paidOrder.userId && !order.commission) {
      await tx.affiliateCommission.create({
        data: {
          orderId: paidOrder.id,
          referrerId: paidOrder.affiliateReferrerId,
          sourceUserId: paidOrder.userId,
          commissionAmount,
        },
      });
    }

    return paidOrder;
  });

  return settled;
};
