import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/db';
import { settlePaidOrder } from '@/lib/server/order-settlement';

const parseNumber = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.VIETQR_WEBHOOK_SECRET || '';
    if (secret) {
      const incoming = request.headers.get('x-webhook-secret') || '';
      if (incoming !== secret) {
        return NextResponse.json({ ok: false, message: 'Unauthorized webhook.' }, { status: 401 });
      }
    }

    const payload = (await request.json()) as Record<string, unknown>;
    const content =
      String(payload.content || payload.description || payload.transferContent || payload.addInfo || '').trim();
    const amount = parseNumber(payload.transferAmount ?? payload.amount ?? payload.creditAmount);
    const transactionId = String(payload.id || payload.transactionId || payload.reference || '').trim();
    if (!content || amount <= 0) {
      return NextResponse.json({ ok: false, message: 'Dữ liệu webhook không hợp lệ.' }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: {
        transferContent: content,
        status: 'PENDING',
      },
    });
    if (!order) {
      return NextResponse.json({ ok: false, message: 'Không tìm thấy đơn hàng phù hợp.' }, { status: 404 });
    }
    if (order.amountVnd !== amount) {
      return NextResponse.json({ ok: false, message: 'Số tiền không khớp đơn hàng.' }, { status: 400 });
    }

    const settled = await settlePaidOrder(order.id, transactionId, JSON.stringify(payload));
    return NextResponse.json({
      ok: true,
      data: {
        orderId: settled?.id || order.id,
        status: settled?.status || 'PAID',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook vietqr lỗi.';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
