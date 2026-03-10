import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/server/auth';
import { prisma } from '@/lib/server/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: 'Bạn cần đăng nhập.' }, { status: 401 });
    }

    const orderId = request.nextUrl.searchParams.get('orderId')?.trim();
    if (!orderId) {
      return NextResponse.json({ ok: false, message: 'Thiếu orderId.' }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: user.id,
      },
      select: {
        id: true,
        status: true,
        plan: true,
        paymentMethod: true,
        amountVnd: true,
        checkoutUrl: true,
        qrImageUrl: true,
        transferContent: true,
      },
    });
    if (!order) {
      return NextResponse.json({ ok: false, message: 'Không tìm thấy đơn hàng.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: order });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không thể tải trạng thái đơn.';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
