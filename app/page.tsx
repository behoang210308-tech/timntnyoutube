import Link from 'next/link';
import { Search, BarChart2, CircleDollarSign, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const features = [
  {
    title: 'Tìm Ngách Tiềm Năng',
    description: 'Quét keyword, xem độ cạnh tranh và chọn ngách nhanh hơn.',
    href: '/timsieungach',
    icon: Search,
  },
  {
    title: 'Phân Tích Kênh',
    description: 'So benchmark kênh đối thủ và đọc insight tăng trưởng.',
    href: '/channel-analyzer',
    icon: BarChart2,
  },
  {
    title: 'Thanh Toán Gói',
    description: 'Chọn gói phù hợp và thanh toán tự động bằng VietQR.',
    href: '/pricing',
    icon: CircleDollarSign,
  },
  {
    title: 'Affiliate Tracking',
    description: 'Theo dõi referral và hoa hồng theo từng đơn hàng.',
    href: '/affiliate',
    icon: Sparkles,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-6xl mx-auto px-4 py-10 md:py-14">
        <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur p-6 md:p-8 shadow-sm">
          <p className="text-sm font-semibold text-blue-600">NTN YouTube Research</p>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 mt-2">
            Bộ công cụ nghiên cứu ngách YouTube dành cho creator
          </h1>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/timsieungach">
              <Button className="rounded-xl bg-blue-500 hover:bg-blue-600">Khám phá ngay</Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" className="rounded-xl">Xem gói và thanh toán</Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {features.map((item) => (
            <Card key={item.title} className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-900">{item.title}</h2>
                  <p className="text-sm text-slate-600 mt-2">{item.description}</p>
                </div>
                <item.icon className="w-5 h-5 text-blue-500 mt-1" />
              </div>
              <Link href={item.href}>
                <Button className="mt-4 rounded-xl">Dùng tính năng này</Button>
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
