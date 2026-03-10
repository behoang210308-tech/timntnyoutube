import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-red-50">
      <div className="max-w-xl mx-auto px-4 py-10">
        <Card className="rounded-2xl border-blue-100 p-6 bg-white shadow-sm space-y-3">
          <h1 className="text-2xl font-black text-slate-900">Quên mật khẩu</h1>
          <p className="text-sm text-slate-600">Nhập số điện thoại hoặc email, hệ thống sẽ gửi hướng dẫn đặt lại mật khẩu.</p>
          <Input placeholder="Số điện thoại hoặc email" className="rounded-xl border-blue-200 focus-visible:ring-blue-500" />
          <Button className="rounded-xl bg-blue-600 hover:bg-blue-700">Gửi yêu cầu</Button>
          <Link href="/login" className="text-sm text-blue-700 font-semibold inline-block">Quay lại đăng nhập</Link>
        </Card>
      </div>
    </main>
  );
}
