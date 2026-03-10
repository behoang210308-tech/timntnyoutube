'use client';

import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { formatDateVN, formatNumber } from '@/lib/utils/format';
import { Wallet, HandCoins, ShoppingCart, UserPlus, ChevronDown, Copy, ArrowDownToLine, ArrowUpFromLine, CreditCard, Gift } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

type TxType = 'PURCHASE' | 'AFFILIATE_COMMISSION' | 'DEPOSIT' | 'WITHDRAW';

interface AccountPayload {
  user: {
    id: string;
    fullName: string;
    phone: string;
    accountCode: string;
    createdAt: string;
    currentPlan: string;
    referralCode: string;
    avatarUrl?: string;
  };
  wallet: {
    walletBalance: number;
    availableBalance: number;
    affiliatePending: number;
    affiliateTotal: number;
    totalWithdrawn: number;
    totalPurchased: number;
    affiliateSuccessCount: number;
    referralCount: number;
  };
  affiliate: {
    referralCode: string;
    referralLink: string;
    description: string;
  };
  payment: {
    bankBin: string;
    accountNo: string;
    accountName: string;
  };
  transactions: Array<{
    id: string;
    type: TxType;
    title: string;
    description: string;
    amount: number;
    status: string;
    createdAt: string;
    relatedOrderId?: string;
  }>;
}

const formatCurrency = (amount: number) => `${amount.toLocaleString('vi-VN')}đ`;
const buildVietQrUrl = (
  payment: AccountPayload['payment'],
  amount: number | null,
  addInfo: string
) => {
  const amountQuery = amount && amount > 0 ? `&amount=${Math.floor(amount)}` : '';
  return `https://img.vietqr.io/image/${payment.bankBin}-${payment.accountNo}-compact2.png?accountName=${encodeURIComponent(payment.accountName)}${amountQuery}&addInfo=${encodeURIComponent(addInfo)}`;
};

const txStyles: Record<TxType, { icon: ComponentType<{ className?: string }>; chip: string; amount: string }> = {
  PURCHASE: { icon: CreditCard, chip: 'bg-red-50 text-red-700 border-red-200', amount: 'text-rose-600' },
  AFFILIATE_COMMISSION: { icon: Gift, chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', amount: 'text-emerald-600' },
  DEPOSIT: { icon: ArrowDownToLine, chip: 'bg-blue-50 text-blue-700 border-blue-200', amount: 'text-emerald-600' },
  WITHDRAW: { icon: ArrowUpFromLine, chip: 'bg-amber-50 text-amber-700 border-amber-200', amount: 'text-rose-600' },
};

function AccountHeader({ phone }: { phone: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-3xl font-black text-slate-900">Thông Tin Tài Khoản</h1>
      <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">{phone.slice(-2)}</div>
        <p className="text-sm font-semibold text-slate-800">{phone}</p>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </div>
    </div>
  );
}

function AccountHeroCard({
  data,
  onOpenDeposit,
  onOpenWithdraw,
}: {
  data: AccountPayload;
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
}) {
  const quickQr = buildVietQrUrl(data.payment, null, `NAP ${data.user.phone}`);
  return (
    <Card className="rounded-3xl border-blue-100 bg-gradient-to-r from-white via-blue-50/40 to-indigo-50/50 p-6 shadow-[0_12px_36px_rgba(37,99,235,0.08)] ui-fade-in">
      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr_220px] gap-5">
        <div className="w-full">
          <p className="text-3xl font-black text-slate-900">{data.user.fullName}</p>
          <p className="text-sm text-slate-500 mt-1">ID hệ thống: {data.user.id.slice(0, 10).toUpperCase()}</p>
          <div className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 mt-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-slate-500 font-semibold">Số điện thoại</p>
                <p className="text-base font-bold text-slate-900 mt-1">{data.user.phone}</p>
                <p className="text-sm text-blue-700 font-semibold mt-1">Mã tài khoản: {data.user.accountCode}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold">Ngày đăng ký</p>
                <p className="text-base font-bold text-slate-900 mt-1">{formatDateVN(data.user.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-blue-700 font-semibold">Gói hiện tại</p>
                <p className="text-base font-bold text-blue-800 mt-1">{data.user.currentPlan}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm p-4">
          <div className="pb-4 border-b border-slate-200">
            <p className="text-xs tracking-[0.12em] font-bold text-slate-500">SỐ DƯ HIỆN TẠI</p>
            <p className="text-5xl font-black text-slate-900 mt-1">{formatCurrency(data.wallet.availableBalance)}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-slate-50 mt-4 p-3">
            <div>
              <p className="text-xs text-slate-500">Hoa hồng đang chờ</p>
              <p className="text-lg font-bold text-amber-600">{formatCurrency(data.wallet.affiliatePending)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Tổng đã rút</p>
              <p className="text-lg font-bold text-rose-600">{formatCurrency(data.wallet.totalWithdrawn)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Tổng hoa hồng</p>
              <p className="text-lg font-bold text-emerald-600">{formatCurrency(data.wallet.affiliateTotal)}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <Button className="rounded-xl bg-blue-600 hover:bg-blue-700 shadow-sm" onClick={onOpenDeposit}><ArrowDownToLine className="w-4 h-4 mr-1.5" />Nạp Tiền</Button>
            <Button variant="outline" className="rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={onOpenWithdraw}><ArrowUpFromLine className="w-4 h-4 mr-1.5" />Rút Tiền</Button>
          </div>
        </div>
        <div className="rounded-xl bg-white/80 p-2">
          <p className="text-xs font-semibold text-slate-600">QR Tự Nhập Tiền</p>
          <div className="rounded-xl border border-blue-100 bg-blue-50 mt-2 p-2">
            <Image src={quickQr} alt="QR nạp tiền nhanh" width={170} height={170} className="w-[170px] h-[170px] mx-auto rounded-lg bg-white object-contain" />
          </div>
          <p className="text-[11px] text-slate-600 mt-2">{data.payment.accountName}</p>
          <p className="text-[11px] text-slate-600">{data.payment.accountNo}</p>
        </div>
      </div>
    </Card>
  );
}

function StatsCards({ data }: { data: AccountPayload }) {
  const cards = [
    { label: 'Số dư hiện có', value: formatCurrency(data.wallet.availableBalance), icon: Wallet },
    { label: 'Tổng hoa hồng', value: formatCurrency(data.wallet.affiliateTotal), icon: HandCoins },
    { label: 'Tổng đã mua', value: formatCurrency(data.wallet.totalPurchased), icon: ShoppingCart },
    { label: 'Affiliate thành công', value: formatNumber(data.wallet.affiliateSuccessCount), icon: UserPlus },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {cards.map((item) => (
        <Card key={item.label} className="rounded-2xl border-slate-100 bg-white p-4 shadow-sm ui-hover-lift">
          <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold">
            <item.icon className="w-4 h-4 text-blue-600" />
            {item.label}
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{item.value}</p>
        </Card>
      ))}
    </div>
  );
}

function WalletActionCards({
  data,
  onOpenDeposit,
  onOpenWithdraw,
}: {
  data: AccountPayload;
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Card className="rounded-2xl border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-blue-700">Nạp Tiền</p>
            <p className="text-xs text-slate-600 mt-1">Bổ sung ngân sách để mua gói và dùng dịch vụ.</p>
            <p className="text-sm font-bold text-slate-800 mt-2">Số dư hiện tại: {formatCurrency(data.wallet.availableBalance)}</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <ArrowDownToLine className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4">
          <Button className="rounded-xl bg-blue-600 hover:bg-blue-700" onClick={onOpenDeposit}>Đi tới nạp tiền</Button>
        </div>
      </Card>

      <Card className="rounded-2xl border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Rút Tiền</p>
            <p className="text-xs text-slate-600 mt-1">Rút từ số dư khả dụng theo quy trình xác minh.</p>
            <p className="text-sm font-bold text-slate-800 mt-2">Có thể rút: {formatCurrency(data.wallet.availableBalance)}</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <ArrowUpFromLine className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4">
          <Button variant="outline" className="rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-100" onClick={onOpenWithdraw}>Đi tới rút tiền</Button>
        </div>
      </Card>
    </div>
  );
}

function WalletModal({
  type,
  open,
  onOpenChange,
  availableBalance,
  payment,
  phone,
}: {
  type: 'deposit' | 'withdraw';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableBalance: number;
  payment: AccountPayload['payment'];
  phone: string;
}) {
  const isDeposit = type === 'deposit';
  const qrImage = buildVietQrUrl(payment, null, `NAP ${phone}`);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border-slate-200 bg-white sm:max-w-2xl p-0 overflow-hidden">
        <div className={`p-6 ${isDeposit ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100' : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100'}`}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900">
              {isDeposit ? 'Nạp Tiền' : 'Rút Tiền'}
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              {isDeposit ? 'Nạp ngân sách để tiếp tục dùng dịch vụ ngay.' : 'Rút tiền từ số dư khả dụng theo quy trình xác minh.'}
            </DialogDescription>
          </DialogHeader>
          <div className={`mt-4 rounded-2xl border px-4 py-3 ${isDeposit ? 'border-blue-200 bg-white' : 'border-emerald-200 bg-white'}`}>
            <p className="text-xs text-slate-500">{isDeposit ? 'Số dư hiện tại' : 'Số dư khả dụng để rút'}</p>
            <p className={`text-3xl font-black mt-1 ${isDeposit ? 'text-blue-700' : 'text-emerald-700'}`}>{formatCurrency(availableBalance)}</p>
          </div>
        </div>
        <div className="p-6 space-y-3">
          <Card className={`rounded-2xl border p-4 ${isDeposit ? 'border-blue-200 bg-blue-50/60' : 'border-emerald-200 bg-emerald-50/60'}`}>
            <p className="text-sm font-semibold text-slate-800">{isDeposit ? 'Nạp qua gói dịch vụ' : 'Gửi yêu cầu rút thủ công'}</p>
            <p className="text-xs text-slate-600 mt-1">{isDeposit ? 'Hiện tại bạn có thể nạp tiền nhanh bằng cách mua gói tại trang bảng giá.' : 'Yêu cầu rút sẽ được duyệt và xử lý theo chính sách thanh toán.'}</p>
          </Card>
          {isDeposit ? (
            <Card className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4">
              <p className="text-sm font-semibold text-slate-800">QR tự nhập tiền</p>
              <p className="text-xs text-slate-600 mt-1">Quét mã và nhập số tiền cần nạp trực tiếp trong app ngân hàng.</p>
              <div className="rounded-xl border border-blue-100 bg-white mt-3 p-2 max-w-[240px]">
                <Image src={qrImage} alt="QR nạp tiền" width={220} height={220} className="w-full h-auto rounded-lg" />
              </div>
            </Card>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Link href={isDeposit ? '/wallet/deposit' : '/wallet/withdraw'}>
              <Button className={`rounded-xl ${isDeposit ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                {isDeposit ? 'Mở trang nạp tiền' : 'Mở trang rút tiền'}
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" className="rounded-xl border-slate-300">Xem bảng giá</Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AffiliateCard({ data }: { data: AccountPayload }) {
  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: 'Đã sao chép', description: `${label} đã được copy thành công.` });
    } catch {
      toast({ title: 'Không thể sao chép', description: 'Vui lòng thử lại.', variant: 'destructive' });
    }
  };

  return (
    <Card className="rounded-2xl border-slate-100 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black text-slate-900">Affiliate</h2>
      <div className="mt-4 space-y-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-800">{data.affiliate.referralCode}</p>
          <Button size="sm" variant="outline" className="rounded-lg h-8" onClick={() => void copyText(data.affiliate.referralCode, 'Mã affiliate')}>
            <Copy className="w-3.5 h-3.5 mr-1" />Copy
          </Button>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-800 truncate">{data.affiliate.referralLink}</p>
          <Button size="sm" variant="outline" className="rounded-lg h-8" onClick={() => void copyText(data.affiliate.referralLink, 'Link giới thiệu')}>
            <Copy className="w-3.5 h-3.5 mr-1" />Copy
          </Button>
        </div>
        <p className="text-sm text-slate-600">{data.affiliate.description}</p>
      </div>
    </Card>
  );
}

function PremiumUpgradeCard({
  fullNameDefault,
  accountCodeDefault,
  onUpgraded,
}: {
  fullNameDefault: string;
  accountCodeDefault: string;
  onUpgraded: () => void;
}) {
  const [fullName, setFullName] = useState(fullNameDefault);
  const [accountCode, setAccountCode] = useState(accountCodeDefault);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const response = await fetch('/api/account/upgrade-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, accountCode }),
      });
      const json = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !json.ok) {
        throw new Error(json.message || 'Không thể nâng cấp.');
      }
      toast({
        title: 'Nâng cấp thành công',
        description: 'Tài khoản đã được nâng lên gói PREMIUM.',
      });
      onUpgraded();
    } catch (error) {
      toast({
        title: 'Nâng cấp thất bại',
        description: error instanceof Error ? error.message : 'Có lỗi xảy ra.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="rounded-2xl border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 p-5 shadow-sm">
      <h2 className="text-xl font-black text-slate-900">Nâng Cấp Premium</h2>
      <p className="text-sm text-slate-600 mt-2">Nhập đúng tên và mã tài khoản riêng để nâng cấp nhanh.</p>
      <div className="mt-4 space-y-3">
        <div>
          <Label className="text-xs text-slate-600">Tên tài khoản</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1 bg-white" />
        </div>
        <div>
          <Label className="text-xs text-slate-600">Mã tài khoản</Label>
          <Input value={accountCode} onChange={(e) => setAccountCode(e.target.value.replace(/[^\d]/g, ''))} className="mt-1 bg-white" />
        </div>
      </div>
      <Button onClick={onSubmit} disabled={loading} className="mt-4 rounded-xl bg-violet-600 hover:bg-violet-700">
        {loading ? 'Đang nâng cấp...' : 'Nâng cấp lên PREMIUM'}
      </Button>
    </Card>
  );
}

function TransactionHistoryCard({ data }: { data: AccountPayload }) {
  const [filter, setFilter] = useState<'ALL' | TxType>('ALL');
  const filtered = useMemo(() => {
    if (filter === 'ALL') return data.transactions;
    return data.transactions.filter((item) => item.type === filter);
  }, [data.transactions, filter]);

  return (
    <Card className="rounded-2xl border-slate-100 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black text-slate-900">Lịch Sử Giao Dịch</h2>
      <Tabs value={filter} onValueChange={(val) => setFilter(val as 'ALL' | TxType)} className="mt-3">
        <TabsList className="bg-slate-100 rounded-xl p-1 h-auto flex-wrap justify-start">
          <TabsTrigger value="ALL" className="rounded-lg">Tất cả</TabsTrigger>
          <TabsTrigger value="PURCHASE" className="rounded-lg">Mua gói</TabsTrigger>
          <TabsTrigger value="AFFILIATE_COMMISSION" className="rounded-lg">Hoa hồng</TabsTrigger>
          <TabsTrigger value="DEPOSIT" className="rounded-lg">Nạp tiền</TabsTrigger>
          <TabsTrigger value="WITHDRAW" className="rounded-lg">Rút tiền</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="space-y-2 mt-4">
        {filtered.length > 0 ? filtered.map((tx) => {
          const style = txStyles[tx.type];
          const Icon = style.icon;
          return (
            <div key={tx.id} className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3 flex items-center justify-between gap-3">
              <div className="flex items-start gap-2 min-w-0">
                <div className={`h-9 w-9 rounded-lg border flex items-center justify-center ${style.chip}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{tx.title}</p>
                  <p className="text-xs text-slate-500 truncate">{tx.description}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-lg font-black ${style.amount}`}>{tx.amount >= 0 ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}</p>
                <p className="text-xs text-slate-500">{formatDateVN(tx.createdAt)}</p>
              </div>
            </div>
          );
        }) : (
          <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-slate-500">
            Chưa có giao dịch cho bộ lọc này.
          </div>
        )}
      </div>
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 mt-4">
        <p className="text-sm text-blue-700 font-semibold">Số dư khả dụng để rút: {formatCurrency(data.wallet.availableBalance)}</p>
      </div>
    </Card>
  );
}

export default function AccountPage() {
  const [loading, setLoading] = useState(true);
  const [requireLogin, setRequireLogin] = useState(false);
  const [data, setData] = useState<AccountPayload | null>(null);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/account/overview');
        const json = (await response.json()) as { ok?: boolean; data?: AccountPayload; message?: string };
        if (response.status === 401) {
          setRequireLogin(true);
          setData(null);
          return;
        }
        if (!response.ok || !json.ok || !json.data) {
          throw new Error(json.message || 'Không tải được dữ liệu tài khoản.');
        }
        setRequireLogin(false);
        setData(json.data);
      } catch (error) {
        toast({
          title: 'Không tải được tài khoản',
          description: error instanceof Error ? error.message : 'Có lỗi xảy ra.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const reloadAccount = async () => {
    const response = await fetch('/api/account/overview');
    const json = (await response.json()) as { ok?: boolean; data?: AccountPayload };
    if (response.ok && json.ok && json.data) {
      setData(json.data);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        {loading ? (
          <Card className="rounded-2xl border-slate-100 bg-white p-6 shadow-sm">
            <p className="text-slate-500">Đang tải thông tin tài khoản...</p>
          </Card>
        ) : null}
        {!loading && requireLogin ? (
          <Card className="rounded-2xl border-slate-100 bg-white p-6 shadow-sm">
            <p className="text-slate-700">Bạn cần đăng nhập để xem thông tin tài khoản.</p>
            <Link href="/login?returnTo=/account">
              <Button className="mt-3 rounded-xl bg-blue-600 hover:bg-blue-700">Đi tới đăng nhập</Button>
            </Link>
          </Card>
        ) : null}
        {!loading && data ? (
          <>
            <AccountHeader phone={data.user.phone} />
            <AccountHeroCard data={data} onOpenDeposit={() => setDepositOpen(true)} onOpenWithdraw={() => setWithdrawOpen(true)} />
            <StatsCards data={data} />
            <WalletActionCards data={data} onOpenDeposit={() => setDepositOpen(true)} onOpenWithdraw={() => setWithdrawOpen(true)} />
            <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1fr] gap-4">
              <div className="space-y-4">
                <PremiumUpgradeCard fullNameDefault={data.user.fullName} accountCodeDefault={data.user.accountCode} onUpgraded={() => void reloadAccount()} />
                <AffiliateCard data={data} />
              </div>
              <TransactionHistoryCard data={data} />
            </div>
            <WalletModal type="deposit" open={depositOpen} onOpenChange={setDepositOpen} availableBalance={data.wallet.availableBalance} payment={data.payment} phone={data.user.phone} />
            <WalletModal type="withdraw" open={withdrawOpen} onOpenChange={setWithdrawOpen} availableBalance={data.wallet.availableBalance} payment={data.payment} phone={data.user.phone} />
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}
