'use client';

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { ArrowUpFromLine, Landmark, Wallet } from 'lucide-react';

export default function WalletWithdrawPage() {
  const [available, setAvailable] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState<null | { amount: number; requestId: string }>(null);
  const [form, setForm] = useState({
    bankName: '',
    accountNo: '',
    accountHolder: '',
    amount: '',
  });

  useEffect(() => {
    fetch('/api/account/overview')
      .then((res) => res.json())
      .then((json: { ok?: boolean; data?: { wallet?: { availableBalance?: number } } }) => {
        if (json.ok) setAvailable(json.data?.wallet?.availableBalance ?? 0);
      })
      .catch(() => setAvailable(0));
  }, []);

  const onSubmit = async () => {
    if (loading) return;
    const amount = Number(form.amount.replace(/[^\d]/g, '')) || 0;
    if (!form.bankName.trim() || !form.accountNo.trim() || !form.accountHolder.trim()) {
      toast({ title: 'Thiếu thông tin', description: 'Vui lòng nhập đầy đủ ngân hàng, số tài khoản, tên người rút.', variant: 'destructive' });
      return;
    }
    if (amount <= 0) {
      toast({ title: 'Số tiền chưa hợp lệ', description: 'Vui lòng nhập số tiền muốn rút.', variant: 'destructive' });
      return;
    }
    if (available !== null && amount > available) {
      toast({ title: 'Vượt số dư khả dụng', description: 'Số tiền rút lớn hơn số dư hiện tại.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/wallet/withdraw-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankName: form.bankName.trim(),
          accountNo: form.accountNo.trim(),
          accountHolder: form.accountHolder.trim(),
          amount,
        }),
      });
      const json = (await response.json()) as {
        ok?: boolean;
        message?: string;
        data?: { requestId?: string; amount?: number; status?: string };
      };
      if (!response.ok || !json.ok || !json.data?.requestId) {
        throw new Error(json.message || 'Gửi yêu cầu rút tiền thất bại.');
      }
      setSubmitted({ amount: json.data.amount || amount, requestId: json.data.requestId });
      setForm((prev) => ({ ...prev, amount: '' }));
      toast({ title: 'Đã gửi yêu cầu', description: 'Yêu cầu rút tiền đang chờ xác nhận.' });
      if (available !== null) {
        setAvailable(Math.max(0, available - (json.data.amount || amount)));
      }
    } catch (error) {
      toast({
        title: 'Không thể gửi yêu cầu',
        description: error instanceof Error ? error.message : 'Vui lòng thử lại.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl space-y-4">
        <Card className="rounded-3xl border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-3xl font-black text-slate-900">Rút Tiền</h1>
              <p className="text-sm text-slate-600 mt-2">Rút từ số dư khả dụng, hệ thống xác minh trước khi xử lý lệnh.</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ArrowUpFromLine className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-white px-4 py-3">
            <p className="text-sm text-slate-600">Số tiền khả dụng để rút</p>
            <p className="text-3xl font-black text-emerald-700">{available !== null ? `${available.toLocaleString('vi-VN')}đ` : '...'}</p>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="rounded-2xl border-emerald-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-700 font-semibold">
              <Landmark className="w-4 h-4" />
              Gửi yêu cầu rút tiền
            </div>
            <p className="text-sm text-slate-600 mt-2">Điền thông tin tài khoản nhận tiền, gửi lệnh và chờ xác nhận.</p>
            <div className="mt-4 space-y-3">
              <div>
                <Label className="text-xs text-slate-600">Ngân hàng</Label>
                <Input
                  value={form.bankName}
                  onChange={(e) => setForm((prev) => ({ ...prev, bankName: e.target.value }))}
                  className="mt-1"
                  placeholder="Ví dụ: Vietcombank"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Số tài khoản</Label>
                <Input
                  value={form.accountNo}
                  onChange={(e) => setForm((prev) => ({ ...prev, accountNo: e.target.value.replace(/[^\d]/g, '') }))}
                  className="mt-1"
                  placeholder="Nhập số tài khoản"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Tên người rút</Label>
                <Input
                  value={form.accountHolder}
                  onChange={(e) => setForm((prev) => ({ ...prev, accountHolder: e.target.value }))}
                  className="mt-1"
                  placeholder="Nhập tên chủ tài khoản"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Số tiền rút</Label>
                <Input
                  value={form.amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value.replace(/[^\d]/g, '') }))}
                  className="mt-1"
                  placeholder="Ví dụ: 150000"
                />
              </div>
            </div>
            <Button onClick={onSubmit} disabled={loading} className="mt-4 rounded-xl bg-emerald-600 hover:bg-emerald-700">
              {loading ? 'Đang gửi...' : 'Gửi yêu cầu rút tiền'}
            </Button>
            {submitted ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
                <p className="font-semibold text-amber-700">Đang chờ xác nhận</p>
                <p className="text-amber-700">Mã yêu cầu: {submitted.requestId}</p>
                <p className="text-amber-700">Số tiền: {submitted.amount.toLocaleString('vi-VN')}đ</p>
              </div>
            ) : null}
            <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
              Liên hệ Zalo 0345.336.453 để rút tiền nhanh hơn.
            </div>
          </Card>
          <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-700 font-semibold">
              <Wallet className="w-4 h-4" />
              Quay lại trung tâm tài khoản
            </div>
            <p className="text-sm text-slate-600 mt-2">Xem chi tiết số dư, hoa hồng và lịch sử giao dịch.</p>
            <Link href="/account"><Button variant="outline" className="mt-4 rounded-xl">Về tài khoản</Button></Link>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
