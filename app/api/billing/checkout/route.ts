import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/server/auth';
import { prisma } from '@/lib/server/db';
import { isPaymentMethodValue, isPlanValue, PLAN_PRICES_VND } from '@/lib/server/billing';
import { createPaymentSession } from '@/lib/server/payment-gateways';

interface CheckoutBody {
  plan?: string;
  paymentMethod?: string;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: 'Bạn cần đăng nhập để thanh toán.' }, { status: 401 });
    }

    const body = (await request.json()) as CheckoutBody;
    const planInput = (body.plan || '').toUpperCase();
    const methodInput = (body.paymentMethod || 'VIETQR').toUpperCase();

    if (!isPlanValue(planInput)) {
      return NextResponse.json({ ok: false, message: 'Gói không hợp lệ.' }, { status: 400 });
    }
    if (!isPaymentMethodValue(methodInput)) {
      return NextResponse.json({ ok: false, message: 'Phương thức thanh toán không hợp lệ.' }, { status: 400 });
    }

    const amountVnd = PLAN_PRICES_VND[planInput];
    const created = await prisma.order.create({
      data: {
        userId: user.id,
        plan: planInput,
        paymentMethod: methodInput,
        amountVnd,
        affiliateReferrerId: user.referredById || undefined,
      },
    });
    const paymentSession = await createPaymentSession({
      orderId: created.id,
      amountVnd,
      method: methodInput,
      plan: planInput,
    });

    const order = await prisma.order.update({
      where: { id: created.id },
      data: {
        paymentProvider: paymentSession.provider,
        providerOrderId: paymentSession.providerOrderId,
        checkoutUrl: paymentSession.checkoutUrl,
        qrImageUrl: paymentSession.qrImageUrl,
        transferContent: paymentSession.transferContent,
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        orderId: order.id,
        plan: order.plan,
        amountVnd: order.amountVnd,
        paymentMethod: order.paymentMethod,
        status: order.status,
        paymentProvider: order.paymentProvider,
        checkoutUrl: order.checkoutUrl,
        qrImageUrl: order.qrImageUrl,
        transferContent: order.transferContent,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không tạo được đơn thanh toán.';
    const status = message.includes('Thiếu cấu hình') ? 400 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
