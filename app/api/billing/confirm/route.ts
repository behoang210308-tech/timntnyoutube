import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/server/auth';
import { prisma } from '@/lib/server/db';
import { AFFILIATE_COMMISSION_RATE_BY_PLAN, BillingPlan } from '@/lib/server/billing';

interface ConfirmBody {
  orderId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: 'Bạn cần đăng nhập để xác nhận thanh toán.' }, { status: 401 });
    }

    const body = (await request.json()) as ConfirmBody;
    const orderId = body.orderId?.trim();
    if (!orderId) {
      return NextResponse.json({ ok: false, message: 'Thiếu orderId.' }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: user.id },
      include: { commission: true },
    });
    if (!order) {
      return NextResponse.json({ ok: false, message: 'Không tìm thấy đơn hàng.' }, { status: 404 });
    }
    if (order.status === 'PAID') {
      return NextResponse.json({ ok: true, data: { orderId: order.id, plan: order.plan, status: order.status } });
    }

    const plan = (order.plan as BillingPlan) || 'TEST';
    const commissionRate = AFFILIATE_COMMISSION_RATE_BY_PLAN[plan] ?? 0.15;
    const commissionAmount = Math.round(order.amountVnd * commissionRate);
    const updated = await prisma.$transaction(async (tx) => {
      const paidOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: {
          plan: paidOrder.plan,
        },
      });

      if (paidOrder.affiliateReferrerId && paidOrder.affiliateReferrerId !== user.id && !order.commission) {
        await tx.affiliateCommission.create({
          data: {
            orderId: paidOrder.id,
            referrerId: paidOrder.affiliateReferrerId,
            sourceUserId: user.id,
            commissionAmount,
          },
        });
      }

      return paidOrder;
    });

    return NextResponse.json({
      ok: true,
      data: {
        orderId: updated.id,
        plan: updated.plan,
        status: updated.status,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không thể xác nhận thanh toán.';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
