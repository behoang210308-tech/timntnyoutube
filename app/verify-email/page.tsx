import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function VerifyEmailPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-red-50 via-white to-blue-50">
      <div className="max-w-xl mx-auto px-4 py-10">
        <Card className="rounded-2xl border-red-100 p-6 bg-white shadow-sm space-y-3">
          <h1 className="text-2xl font-black text-slate-900">Xác minh email</h1>
          <p className="text-sm text-slate-600">Tài khoản cần xác minh trước khi dùng một số tính năng nâng cao.</p>
          <Button className="rounded-xl bg-red-600 hover:bg-red-700">Gửi lại email xác minh</Button>
          <Link href="/login" className="text-sm text-blue-700 font-semibold inline-block">Quay lại đăng nhập</Link>
        </Card>
      </div>
    </main>
  );
}
