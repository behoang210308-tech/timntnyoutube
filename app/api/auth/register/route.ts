import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/db';
import { createReferralCode, createSession, hashPassword, normalizePhone } from '@/lib/server/auth';

interface RegisterBody {
  fullName?: string;
  phone?: string;
  password?: string;
  referralCode?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RegisterBody;
    const fullName = body.fullName?.trim();
    const phone = normalizePhone(body.phone || '');
    const password = body.password || '';
    const referralCode = body.referralCode?.trim().toUpperCase();

    if (!fullName || phone.length < 8 || password.length < 6) {
      return NextResponse.json({ ok: false, message: 'Thông tin đăng ký chưa hợp lệ.' }, { status: 400 });
    }

    const existed = await prisma.user.findUnique({ where: { phone } });
    if (existed) {
      return NextResponse.json({ ok: false, message: 'Số điện thoại đã tồn tại.' }, { status: 409 });
    }

    const referrer = referralCode
      ? await prisma.user.findUnique({
          where: { referralCode },
          select: { id: true },
        })
      : null;

    const user = await prisma.user.create({
      data: {
        fullName,
        phone,
        passwordHash: hashPassword(password),
        referralCode: createReferralCode(phone),
        referredById: referrer?.id,
      },
    });

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
    const message = error instanceof Error ? error.message : 'Đăng ký thất bại.';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
