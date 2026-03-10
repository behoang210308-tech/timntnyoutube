import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/server/auth';
import { prisma } from '@/lib/server/db';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: 'Bạn cần đăng nhập.' }, { status: 401 });
    }

    const [commissions, referralCount] = await Promise.all([
      prisma.affiliateCommission.findMany({
        where: { referrerId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          sourceUser: {
            select: {
              fullName: true,
              phone: true,
            },
          },
          order: {
            select: {
              plan: true,
              amountVnd: true,
            },
          },
        },
      }),
      prisma.user.count({
        where: { referredById: user.id },
      }),
    ]);

    const totalCommission = commissions.reduce((sum, item) => sum + item.commissionAmount, 0);

    return NextResponse.json({
      ok: true,
      data: {
        referralCode: user.referralCode,
        referralCount,
        totalCommission,
        commissions: commissions.map((item) => ({
          id: item.id,
          sourceUser: item.sourceUser.fullName,
          sourcePhone: item.sourceUser.phone,
          plan: item.order.plan,
          orderValue: item.order.amountVnd,
          commissionAmount: item.commissionAmount,
          createdAt: item.createdAt,
        })),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không thể tải báo cáo affiliate.';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
