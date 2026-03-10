import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/server/auth';

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: 'Chưa đăng nhập.' }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    data: {
      id: user.id,
      fullName: user.fullName,
      phone: user.phone,
      plan: user.plan,
      referralCode: user.referralCode,
      referredById: user.referredById,
    },
  });
}
