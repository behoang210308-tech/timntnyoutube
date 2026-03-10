import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/db';
import { createSession, normalizePhone, verifyPassword } from '@/lib/server/auth';

interface LoginBody {
  phone?: string;
  password?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LoginBody;
    const phone = normalizePhone(body.phone || '');
    const password = body.password || '';

    if (phone.length < 8 || password.length < 6) {
      return NextResponse.json({ ok: false, message: 'Thông tin đăng nhập chưa hợp lệ.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ ok: false, message: 'Sai số điện thoại hoặc mật khẩu.' }, { status: 401 });
    }

    await createSession(user.id);

    return NextResponse.json({
      ok: true,
      data: {
        id: user.id,
        fullName: user.fullName,
        phone: user.phone,
        plan: user.plan,
        referralCode: user.referralCode,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Đăng nhập thất bại.';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
