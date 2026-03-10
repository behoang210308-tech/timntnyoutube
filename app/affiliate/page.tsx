'use client';

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/lib/utils/format';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';

interface CommissionItem {
  id: string;
  sourceUser: string;
  sourcePhone: string;
  plan: string;
  orderValue: number;
  commissionAmount: number;
  createdAt: string;
}

interface SummaryData {
  referralCode: string;
  referralCount: number;
  totalCommission: number;
  commissions: CommissionItem[];
}

export default function AffiliatePage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [requireLogin, setRequireLogin] = useState(false);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/affiliate/summary');
      const json = (await response.json()) as { ok?: boolean; data?: SummaryData; message?: string };
      if (response.status === 401) {
        setRequireLogin(true);
        setSummary(null);
        return;
      }
      if (!response.ok || !json.ok || !json.data) {
        throw new Error(json.message || 'Không tải được dữ liệu affiliate.');
      }
      setRequireLogin(false);
      setSummary(json.data);
    } catch (error) {
      toast({
        title: 'Không tải được Affiliate',
        description: error instanceof Error ? error.message : 'Có lỗi xảy ra.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  return (
    <AppLayout>
      <div className="space-y-4">
        <Card className="rounded-2xl border-slate-100 p-5 bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50">
          <h1 className="text-2xl font-black text-slate-900">Affiliate Tracking</h1>
          <p className="text-sm text-slate-600 mt-1">Theo dõi mã giới thiệu, số lượng referral và hoa hồng theo từng gói nâng cấp.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge className="bg-blue-50 text-blue-700 border border-blue-200">TEST / BASIC / STANDARD: 15%</Badge>
            <Badge className="bg-violet-50 text-violet-700 border border-violet-200">PRO: 20%</Badge>
            <Badge className="bg-amber-50 text-amber-700 border border-amber-200">PREMIUM: 25%</Badge>
          </div>
        </Card>

        {requireLogin ? (
          <Card className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm">
            <p className="text-sm text-slate-700">Bạn cần đăng nhập để xem báo cáo affiliate.</p>
            <Link href="/login?returnTo=/affiliate">
              <Button className="mt-3 rounded-xl bg-blue-500 hover:bg-blue-600">Đi tới đăng nhập</Button>
            </Link>
          </Card>
        ) : null}

        {!requireLogin && summary ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card className="rounded-2xl border-slate-100 p-4 bg-white shadow-sm">
                <p className="text-xs text-slate-500">Mã giới thiệu</p>
                <p className="text-lg font-black text-slate-900 mt-1">{summary.referralCode}</p>
              </Card>
              <Card className="rounded-2xl border-slate-100 p-4 bg-white shadow-sm">
                <p className="text-xs text-slate-500">Số người đã giới thiệu</p>
                <p className="text-lg font-black text-slate-900 mt-1">{formatNumber(summary.referralCount)}</p>
              </Card>
              <Card className="rounded-2xl border-slate-100 p-4 bg-white shadow-sm">
                <p className="text-xs text-slate-500">Tổng hoa hồng</p>
                <p className="text-lg font-black text-emerald-700 mt-1">{formatNumber(summary.totalCommission)}đ</p>
              </Card>
            </div>

            <Card className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm">
              <h2 className="font-bold text-slate-900">Lịch sử hoa hồng</h2>
              <div className="space-y-2 mt-3">
                {summary.commissions.length > 0 ? (
                  summary.commissions.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.sourceUser} · {item.sourcePhone}</p>
                        <p className="text-xs text-slate-500">Plan {item.plan} · Đơn {formatNumber(item.orderValue)}đ</p>
                      </div>
                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">
                        +{formatNumber(item.commissionAmount)}đ
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Chưa có hoa hồng nào.</p>
                )}
              </div>
            </Card>
          </>
        ) : null}

        {loading ? (
          <Card className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm">
            <p className="text-sm text-slate-500">Đang tải dữ liệu affiliate...</p>
          </Card>
        ) : null}
      </div>
    </AppLayout>
  );
}
