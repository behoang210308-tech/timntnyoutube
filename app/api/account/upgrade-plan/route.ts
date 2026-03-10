import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/server/auth';
import { prisma } from '@/lib/server/db';

const buildAccountCode = (userId: string) => {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) % 90000;
  }
  return String(hash + 10000);
};

interface UpgradeBody {
  fullName?: string;
  accountCode?: string;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: 'Bạn cần đăng nhập.' }, { status: 401 });
    }

    const body = (await request.json()) as UpgradeBody;
    const fullName = (body.fullName || '').trim().toLowerCase();
    const accountCode = (body.accountCode || '').trim();
    const currentCode = buildAccountCode(user.id);

    if (!fullName || !accountCode) {
      return NextResponse.json({ ok: false, message: 'Thiếu tên hoặc mã tài khoản.' }, { status: 400 });
    }

    if (fullName !== user.fullName.trim().toLowerCase() || accountCode !== currentCode) {
      return NextResponse.json({ ok: false, message: 'Tên hoặc mã tài khoản không khớp.' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { plan: 'PREMIUM' },
      select: { id: true, plan: true, fullName: true },
    });

    return NextResponse.json({
      ok: true,
      data: updated,
      message: 'Đã nâng cấp tài khoản lên PREMIUM thành công.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không thể nâng cấp tài khoản.';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
