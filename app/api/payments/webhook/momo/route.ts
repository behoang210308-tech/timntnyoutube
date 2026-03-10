import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message: 'Kênh thanh toán Momo đã ngừng sử dụng. Vui lòng dùng VietQR.',
    },
    { status: 410 }
  );
}
