
'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { ApiKeyManager } from '@/components/api-key/ApiKeyManager';

export default function ApiKeysPage() {
  return (
    <AppLayout>
      <div className="mb-6 rounded-2xl border border-slate-100 bg-gradient-to-r from-blue-50 via-indigo-50 to-violet-50 p-5">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">API Keys & Connections</h1>
        <p className="text-slate-600 mt-1">
          Lưu key mã hóa local, test kết nối thật và quản lý trạng thái connected/disconnected theo từng dịch vụ.
        </p>
      </div>
      <ApiKeyManager />
    </AppLayout>
  );
}
