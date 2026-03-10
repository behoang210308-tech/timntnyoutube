import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/server/auth';
import { prisma } from '@/lib/server/db';
import { AFFILIATE_COMMISSION_RATE_BY_PLAN, BillingPlan } from '@/lib/server/billing';

type TransactionType = 'PURCHASE' | 'AFFILIATE_COMMISSION' | 'DEPOSIT' | 'WITHDRAW';
const buildAccountCode = (userId: string) => {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) % 90000;
  }
  return String(hash + 10000);
};

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: 'Bạn cần đăng nhập.' }, { status: 401 });
    }

    const [referralCount, commissions, paidOrders, pendingAffiliateOrders, withdrawOrders] = await Promise.all([
      prisma.user.count({ where: { referredById: user.id } }),
      prisma.affiliateCommission.findMany({
        where: { referrerId: user.id },
        orderBy: { createdAt: 'desc' },
        include: {
          sourceUser: { select: { fullName: true, phone: true } },
          order: { select: { plan: true, amountVnd: true } },
        },
      }),
      prisma.order.findMany({
        where: { userId: user.id, status: 'PAID' },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          plan: true,
          amountVnd: true,
          createdAt: true,
        },
      }),
      prisma.order.findMany({
        where: {
          affiliateReferrerId: user.id,
          status: 'PENDING',
        },
        select: {
          id: true,
          plan: true,
          amountVnd: true,
          createdAt: true,
        },
      }),
      prisma.order.findMany({
        where: {
          userId: user.id,
          paymentMethod: 'WITHDRAW',
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          amountVnd: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    const totalCommission = commissions.reduce((sum, item) => sum + item.commissionAmount, 0);
    const affiliatePending = pendingAffiliateOrders.reduce((sum, item) => {
      const plan = (item.plan as BillingPlan) || 'TEST';
      const rate = AFFILIATE_COMMISSION_RATE_BY_PLAN[plan] ?? 0.15;
      return sum + Math.round(item.amountVnd * rate);
    }, 0);
    const totalPurchased = paidOrders.reduce((sum, item) => sum + item.amountVnd, 0);
    const totalWithdrawn = withdrawOrders
      .filter((item) => item.status === 'PAID')
      .reduce((sum, item) => sum + item.amountVnd, 0);
    const pendingWithdraw = withdrawOrders
      .filter((item) => item.status === 'PENDING')
      .reduce((sum, item) => sum + item.amountVnd, 0);
    const walletBalance = totalCommission;
    const availableBalance = Math.max(0, walletBalance - totalWithdrawn - pendingWithdraw);

    const purchaseTransactions = paidOrders.map((item) => ({
      id: `purchase-${item.id}`,
      type: 'PURCHASE' as TransactionType,
      title: `Mua gói ${item.plan}`,
      description: `Thanh toán nâng cấp gói ${item.plan}`,
      amount: -item.amountVnd,
      status: 'PAID',
      createdAt: item.createdAt,
      relatedOrderId: item.id,
    }));

    const commissionTransactions = commissions.map((item) => ({
      id: `commission-${item.id}`,
      type: 'AFFILIATE_COMMISSION' as TransactionType,
      title: `Hoa hồng từ ${item.sourceUser.fullName}`,
      description: `Đơn ${item.order.plan} · ${item.sourceUser.phone}`,
      amount: item.commissionAmount,
      status: 'PAID',
      createdAt: item.createdAt,
      relatedOrderId: item.orderId,
    }));

    const withdrawTransactions = withdrawOrders.map((item) => ({
      id: `withdraw-${item.id}`,
      type: 'WITHDRAW' as TransactionType,
      title: 'Yêu cầu rút tiền',
      description: item.status === 'PAID' ? 'Lệnh rút đã hoàn tất' : 'Đang chờ xác nhận',
      amount: -item.amountVnd,
      status: item.status,
      createdAt: item.createdAt,
      relatedOrderId: item.id,
    }));

    const transactions = [...purchaseTransactions, ...commissionTransactions, ...withdrawTransactions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const appBaseUrl = process.env.APP_BASE_URL || 'https://timsieungach.com';
    const bankBin = process.env.VIETQR_BANK_BIN || '970436';
    const accountNo = process.env.VIETQR_ACCOUNT_NO || '';
    const accountName = process.env.VIETQR_ACCOUNT_NAME || 'TRUONGHOANGBE';
    const accountCode = buildAccountCode(user.id);

    return NextResponse.json({
      ok: true,
      data: {
        user: {
          id: user.id,
          fullName: user.fullName,
          phone: user.phone,
          createdAt: user.createdAt,
          currentPlan: user.plan,
          referralCode: user.referralCode,
          avatarUrl: '',
          accountCode,
        },
        wallet: {
          walletBalance,
          availableBalance,
          affiliatePending,
          affiliateTotal: totalCommission,
          totalWithdrawn,
          totalPurchased,
          affiliateSuccessCount: commissions.length,
          referralCount,
        },
        affiliate: {
          referralCode: user.referralCode,
          referralLink: `${appBaseUrl.replace(/\/$/, '')}/auth?tab=register&referralCode=${encodeURIComponent(user.referralCode)}`,
          description:
            'Khi có người mua gói qua mã hoặc link giới thiệu của bạn, hệ thống tự động cộng hoa hồng vào số dư.',
        },
        payment: {
          bankBin,
          accountNo,
          accountName,
        },
        transactions,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không thể tải thông tin tài khoản.';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
