'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';

const steps = [
  {
    title: 'Bước 1: Cấu hình API Keys',
    detail: 'Vào API Keys, thêm YouTube key để mở dữ liệu thật. Thêm Gemini/OpenRouter nếu cần AI insight.',
  },
  {
    title: 'Bước 2: Quét Tìm Ngách',
    detail: 'Nhập keyword gốc, chọn market + thời gian + loại video, sau đó bấm Quét Ngách Ngay.',
  },
  {
    title: 'Bước 3: Đọc tín hiệu quyết định',
    detail: 'Ưu tiên case có Gold Mine score cao, kênh nhỏ view lớn và view/sub ratio mạnh.',
  },
  {
    title: 'Bước 4: Lưu thành project',
    detail: 'Bấm Tạo File Quét để lưu snapshot và quay lại nghiên cứu tiếp ở Saved Projects.',
  },
  {
    title: 'Bước 5: Đào sâu bằng Channel Analyzer + Keyword Explorer',
    detail: 'Bóc chiến lược đối thủ và mở rộng ý tưởng keyword để chốt kế hoạch nội dung tuần.',
  },
];

export default function GuidesPage() {
  return (
    <AppLayout>
      <div className="space-y-4">
        <Card className="rounded-2xl border-slate-100 p-5 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50">
          <h1 className="text-2xl font-black text-slate-900">Hướng Dẫn Sử Dụng</h1>
          <p className="text-sm text-slate-500 mt-1">Flow chuẩn để bạn đi từ dữ liệu đến quyết định làm video nhanh nhất.</p>
        </Card>
        <div className="space-y-3">
          {steps.map((step) => (
            <Card key={step.title} className="rounded-2xl border-slate-100 p-4 bg-white shadow-sm">
              <h2 className="font-bold text-slate-900">{step.title}</h2>
              <p className="text-sm text-slate-600 mt-1">{step.detail}</p>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
