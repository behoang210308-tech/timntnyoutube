'use client';

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUiStore, Plan } from '@/lib/store/ui-store';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { Crown, Sparkles, CreditCard } from 'lucide-react';

const plans = [
  { name: 'TEST', price: '21K / 3 ngày', features: ['Tìm Ngách không giới hạn', 'Hoa hồng affiliate 15%'], highlight: false },
  { name: 'BASIC', price: '150K / 1 tháng', features: ['Tìm Ngách', 'Auto đổi ngôn ngữ keyword', 'Phân Tích Kênh', 'Hoa hồng affiliate 15%'], highlight: false },
  { name: 'STANDARD', price: '450K / 3 tháng', features: ['Gần đủ tính năng', 'Khóa AI insight nâng cao', 'Hoa hồng affiliate 15%'], highlight: false },
  { name: 'PRO', price: '750K / 6 tháng', features: ['Full tính năng', 'Ưu tiên support', 'Hoa hồng affiliate 20%'], highlight: true },
  { name: 'PREMIUM', price: '1200K / 12 tháng', features: ['Full tính năng', 'Ưu tiên roadmap', 'Hoa hồng affiliate 25%'], highlight: false },
];

const planToneMap: Record<string, { card: string; chip: string; feature: string; qrBox: string }> = {
  TEST: {
    card: 'border-blue-200 bg-blue-50/40',
    chip: 'bg-blue-600 text-white',
    feature: 'border-blue-100 bg-white',
    qrBox: 'border-blue-200 bg-blue-50',
  },
  BASIC: {
    card: 'border-red-200 bg-red-50/40',
    chip: 'bg-red-600 text-white',
    feature: 'border-red-100 bg-white',
    qrBox: 'border-red-200 bg-red-50',
  },
  STANDARD: {
    card: 'border-amber-200 bg-amber-50/50',
    chip: 'bg-amber-500 text-white',
    feature: 'border-amber-100 bg-white',
    qrBox: 'border-amber-200 bg-amber-50',
  },
  PRO: {
    card: 'border-blue-300 bg-blue-50/50',
    chip: 'bg-blue-600 text-white',
    feature: 'border-blue-100 bg-white',
    qrBox: 'border-blue-200 bg-blue-50',
  },
  PREMIUM: {
    card: 'border-red-200 bg-red-50/40',
    chip: 'bg-red-600 text-white',
    feature: 'border-red-100 bg-white',
    qrBox: 'border-red-200 bg-red-50',
  },
};

export default function PricingPage() {
  const { plan: currentPlan, setPlan } = useUiStore();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [loadingPlan, setLoadingPlan] = useState<Plan | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeOrder, setActiveOrder] = useState<{
    orderId: string;
    plan: Plan;
    status: string;
    qrImageUrl?: string;
    transferContent?: string;
    paymentMethod: 'VIETQR';
    amountVnd: number;
  } | null>(null);
  const [qrExpandedMap, setQrExpandedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((json: { ok?: boolean; data?: { plan?: Plan } }) => {
        if (json.ok && json.data?.plan) {
          setIsLoggedIn(true);
          setPlan(json.data.plan);
        } else {
          setIsLoggedIn(false);
        }
      })
      .catch(() => setIsLoggedIn(false));
  }, [setPlan]);

  const handleCheckout = async (plan: Plan) => {
    if (!isLoggedIn) {
      router.push('/login?returnTo=/pricing');
      return;
    }

    setLoadingPlan(plan);
    try {
      const checkoutRes = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          paymentMethod: 'VIETQR',
        }),
      });
      const checkoutJson = (await checkoutRes.json()) as {
        ok?: boolean;
        message?: string;
        data?: {
          orderId: string;
          plan: Plan;
          status: string;
          qrImageUrl?: string;
          transferContent?: string;
          paymentMethod: 'VIETQR';
          amountVnd: number;
        };
      };
      if (!checkoutRes.ok || !checkoutJson.ok || !checkoutJson.data?.orderId) {
        throw new Error(checkoutJson.message || 'Không tạo được đơn hàng.');
      }
      setActiveOrder(checkoutJson.data);
      setQrExpandedMap((prev) => ({ ...prev, [checkoutJson.data.plan]: true }));
      toast({
        title: 'Đơn hàng đã tạo',
        description: 'Quét mã VietQR để thanh toán. Hệ thống tự kích hoạt khi nhận giao dịch.',
      });
    } catch (error) {
      toast({
        title: 'Thanh toán thất bại',
        description: error instanceof Error ? error.message : 'Có lỗi xảy ra.',
        variant: 'destructive',
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  useEffect(() => {
    if (!activeOrder || activeOrder.status === 'PAID') return;

    const interval = setInterval(async () => {
      const response = await fetch(`/api/billing/status?orderId=${encodeURIComponent(activeOrder.orderId)}`);
      const json = (await response.json()) as {
        ok?: boolean;
        data?: { status?: string; plan?: Plan };
      };
      if (!response.ok || !json.ok || !json.data?.status) return;

      if (json.data.status === 'PAID') {
        setPlan((json.data.plan || activeOrder.plan) as Plan);
        setActiveOrder((prev) => (prev ? { ...prev, status: 'PAID' } : prev));
        toast({
          title: 'Thanh toán thành công',
          description: `Gói ${(json.data.plan || activeOrder.plan) as Plan} đã được kích hoạt tự động.`,
        });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activeOrder, setPlan]);

  return (
    <AppLayout>
      <div className="space-y-4 ui-fade-in">
        <Card className="rounded-2xl border-slate-100 p-5 bg-gradient-to-r from-blue-50 via-indigo-50 to-violet-50 ui-card">
          <h1 className="text-2xl font-black text-slate-900">Bảng Giá</h1>
          <p className="text-sm text-slate-500 mt-1">Chọn gói phù hợp, tạo đơn và xác nhận thanh toán để kích hoạt plan thật.</p>
          <p className="text-xs text-blue-700 font-semibold mt-2">Gói hiện tại: {currentPlan}</p>
          <div className="mt-3 flex items-center gap-2">
            <Badge className="bg-blue-500 text-white"><CreditCard className="w-3.5 h-3.5 mr-1" />VCB VietQR</Badge>
            {!isLoggedIn ? (
              <Link href="/login?returnTo=/pricing">
                <Button size="sm" variant="secondary" className="rounded-lg">Đăng nhập để thanh toán</Button>
              </Link>
            ) : null}
          </div>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {plans.map((plan, index) => {
            const tone = planToneMap[plan.name] || planToneMap.TEST;
            const isOrderCard = activeOrder?.plan === plan.name;
            const orderForCard = isOrderCard ? activeOrder : null;
            const qrExpanded = qrExpandedMap[plan.name] ?? true;
            return (
            <motion.div
              key={plan.name}
              className="h-full"
              initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: reduceMotion ? 0 : index * 0.03 }}
              whileHover={reduceMotion ? undefined : { y: -4 }}
            >
            <Card className={`rounded-2xl p-5 border shadow-sm flex flex-col h-full ui-hover-lift ${plan.highlight ? 'ring-1 ring-blue-200' : ''} ${tone.card} ${isOrderCard ? 'ring-2 ring-blue-400/60 shadow-[0_0_0_4px_rgba(59,130,246,0.12)]' : ''}`}>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black text-slate-900">{plan.name}</h2>
                  {plan.highlight ? <Badge className={tone.chip}><Crown className="w-3.5 h-3.5 mr-1" />Đề xuất</Badge> : null}
                </div>
                <p className="text-lg font-bold text-slate-800 mt-1">{plan.price}</p>
                <div className="space-y-2 mt-4">
                  {plan.features.map((item) => (
                    <div key={item} className={`text-sm text-slate-700 rounded-lg border px-3 py-2 ${tone.feature}`}>{item}</div>
                  ))}
                </div>
              </div>
              <Button
                className="mt-4 w-full rounded-xl bg-blue-600 hover:bg-blue-700 h-11"
                variant={currentPlan === plan.name ? 'secondary' : 'default'}
                onClick={() => handleCheckout(plan.name as Plan)}
                disabled={loadingPlan !== null}
              >
                {loadingPlan === plan.name ? 'Đang xử lý...' : currentPlan === plan.name ? `Đang dùng ${plan.name}` : <span className="inline-flex items-center gap-1.5"><Sparkles className="w-4 h-4" />Thanh toán gói {plan.name}</span>}
              </Button>
              {orderForCard ? (
                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">Đơn #{orderForCard.orderId}</p>
                    <Badge className={orderForCard.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                      {orderForCard.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Số tiền: {orderForCard.amountVnd.toLocaleString('vi-VN')}đ
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-slate-700 font-semibold">Mã QR thanh toán</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg h-8"
                      onClick={() => setQrExpandedMap((prev) => ({ ...prev, [plan.name]: !qrExpanded }))}
                    >
                      {qrExpanded ? 'Ẩn QR' : 'Hiện QR'}
                    </Button>
                  </div>
                  <div className={`grid transition-all duration-300 ease-out ${qrExpanded ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0 mt-0'}`}>
                    <div className="overflow-hidden">
                      <div className={`rounded-xl border p-3 ${tone.qrBox}`}>
                        {orderForCard.qrImageUrl ? (
                          <img src={orderForCard.qrImageUrl} alt="VietQR" className="w-[180px] h-[180px] mx-auto rounded-lg bg-white" />
                        ) : (
                          <p className="text-xs text-slate-600">Thiếu cấu hình VIETQR_ACCOUNT_NO nên chưa tạo được QR.</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-700 mt-3 font-semibold">Nội dung chuyển khoản</p>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 font-semibold mt-1 break-all">
                    {orderForCard.transferContent || `NTN-${orderForCard.orderId}`}
                  </div>
                </div>
              ) : null}
            </Card>
            </motion.div>
          )})}
        </div>
      </div>
    </AppLayout>
  );
}
