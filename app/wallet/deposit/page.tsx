'use client';

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowDownToLine, CreditCard, Wallet } from 'lucide-react';
import Image from 'next/image';

interface DepositMeta {
  availableBalance: number;
  bankBin: string;
  accountNo: string;
  accountName: string;
  phone: string;
}

const formatCurrency = (amount: number) => `${amount.toLocaleString('vi-VN')}đ`;
const buildVietQrUrl = (bankBin: string, accountNo: string, accountName: string, phone: string) =>
  `https://img.vietqr.io/image/${bankBin}-${accountNo}-compact2.png?accountName=${encodeURIComponent(accountName)}&addInfo=${encodeURIComponent(`NAP ${phone}`)}`;

export default function WalletDepositPage() {
  const [meta, setMeta] = useState<DepositMeta | null>(null);

  useEffect(() => {
    fetch('/api/account/overview')
      .then((res) => res.json())
      .then((json: {
        ok?: boolean;
        data?: {
          wallet?: { availableBalance?: number };
          payment?: { bankBin?: string; accountNo?: string; accountName?: string };
          user?: { phone?: string };
        };
      }) => {
        if (json.ok) {
          setMeta({
            availableBalance: json.data?.wallet?.availableBalance ?? 0,
            bankBin: json.data?.payment?.bankBin || '970436',
            accountNo: json.data?.payment?.accountNo || '',
            accountName: json.data?.payment?.accountName || 'TRUONGHOANGBE',
            phone: json.data?.user?.phone || '',
          });
        }
      })
      .catch(() => setMeta({
        availableBalance: 0,
        bankBin: '970436',
        accountNo: '',
        accountName: 'TRUONGHOANGBE',
        phone: '',
      }));
  }, []);

  return (
    <AppLayout>
      <div className="max-w-4xl space-y-4">
        <Card className="rounded-3xl border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-3xl font-black text-slate-900">Nạp Tiền</h1>
              <p className="text-sm text-slate-600 mt-2">Nạp thêm ngân sách để mua gói và dùng dịch vụ ngay.</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <ArrowDownToLine className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-blue-200 bg-white px-4 py-3">
            <p className="text-sm text-slate-600">Số dư hiện tại</p>
            <p className="text-3xl font-black text-slate-900">{meta !== null ? formatCurrency(meta.availableBalance) : '...'}</p>
          </div>
          {meta ? (
            <div className="mt-4 rounded-2xl border border-blue-200 bg-white p-4 max-w-[280px]">
              <p className="text-sm font-semibold text-slate-700 mb-2">QR tự nhập tiền</p>
              <p className="text-xs text-slate-600 mb-3">Quét mã và tự nhập số tiền muốn chuyển trong ứng dụng ngân hàng.</p>
              <Image
                src={buildVietQrUrl(meta.bankBin, meta.accountNo, meta.accountName, meta.phone)}
                alt="QR nạp tiền"
                width={240}
                height={240}
                className="w-full h-auto rounded-lg"
              />
              <p className="text-xs text-slate-600 mt-2">{meta.accountName}</p>
              <p className="text-xs text-slate-600">{meta.accountNo}</p>
            </div>
          ) : null}
          <div className="mt-4">
            <Link href="/account"><Button variant="outline" className="rounded-xl">Về tài khoản</Button></Link>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="rounded-2xl border-indigo-200 bg-indigo-50 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-indigo-700 font-semibold">
              <CreditCard className="w-4 h-4" />
              Mua gói ngay
            </div>
            <p className="text-sm text-slate-600 mt-2">Mua trực tiếp các gói bằng VietQR để kích hoạt tính năng.</p>
            <Link href="/pricing"><Button className="mt-4 rounded-xl bg-indigo-600 hover:bg-indigo-700">Đi tới bảng giá</Button></Link>
          </Card>
          <Card className="rounded-2xl border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-700 font-semibold">
              <Wallet className="w-4 h-4" />
              Quay lại trung tâm tài khoản
            </div>
            <p className="text-sm text-slate-600 mt-2">Theo dõi số dư, hoa hồng affiliate và lịch sử giao dịch.</p>
            <Link href="/account"><Button variant="outline" className="mt-4 rounded-xl">Về tài khoản</Button></Link>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
