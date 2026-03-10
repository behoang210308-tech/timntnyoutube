import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/server/auth';
import { prisma } from '@/lib/server/db';

interface WithdrawBody {
  bankName?: string;
  accountNo?: string;
  accountHolder?: string;
  amount?: number;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: 'Bạn cần đăng nhập.' }, { status: 401 });
    }

    const body = (await request.json()) as WithdrawBody;
    const bankName = (body.bankName || '').trim();
    const accountNo = (body.accountNo || '').trim();
    const accountHolder = (body.accountHolder || '').trim();
    const amount = Number(body.amount || 0);

    if (!bankName || !accountNo || !accountHolder) {
      return NextResponse.json({ ok: false, message: 'Thiếu thông tin tài khoản nhận tiền.' }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ ok: false, message: 'Số tiền rút không hợp lệ.' }, { status: 400 });
    }

    const [commissions, withdrawOrders] = await Promise.all([
      prisma.affiliateCommission.findMany({
        where: { referrerId: user.id },
        select: { commissionAmount: true },
      }),
      prisma.order.findMany({
        where: { userId: user.id, paymentMethod: 'WITHDRAW' },
        select: { amountVnd: true, status: true },
      }),
    ]);

    const totalCommission = commissions.reduce((sum, item) => sum + item.commissionAmount, 0);
    const totalWithdrawn = withdrawOrders
      .filter((item) => item.status === 'PAID')
      .reduce((sum, item) => sum + item.amountVnd, 0);
    const pendingWithdraw = withdrawOrders
      .filter((item) => item.status === 'PENDING')
      .reduce((sum, item) => sum + item.amountVnd, 0);
    const availableBalance = Math.max(0, totalCommission - totalWithdrawn - pendingWithdraw);

    if (amount > availableBalance) {
      return NextResponse.json({ ok: false, message: 'Số tiền rút vượt quá số dư khả dụng.' }, { status: 400 });
    }

    const created = await prisma.order.create({
      data: {
        userId: user.id,
        plan: 'WITHDRAW_REQUEST',
        amountVnd: Math.round(amount),
        status: 'PENDING',
        paymentMethod: 'WITHDRAW',
        paymentProvider: 'MANUAL',
        callbackPayload: JSON.stringify({
          bankName,
          accountNo,
          accountHolder,
          requestedByPhone: user.phone,
        }),
      },
      select: {
        id: true,
        amountVnd: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        requestId: created.id,
        amount: created.amountVnd,
        status: created.status,
        createdAt: created.createdAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không thể gửi yêu cầu rút tiền.';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
