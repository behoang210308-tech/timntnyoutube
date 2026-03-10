'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { useResearchStore } from '@/lib/store/research-store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatNumber, formatTime } from '@/lib/utils/format';
import { useUiStore } from '@/lib/store/ui-store';
import { UpgradeDialog } from '@/components/common/UpgradeDialog';
import { useState } from 'react';

export default function SavedProjectsPage() {
  const { projects, watchlist, removeProject, removeWatchlistChannel } = useResearchStore();
  const { hasFeature } = useUiStore();
  const [openUpgrade, setOpenUpgrade] = useState(false);
  const canUseSavedProjects = hasFeature('savedProjects');

  return (
    <AppLayout>
      <div className="space-y-4">
        <UpgradeDialog open={openUpgrade} onOpenChange={setOpenUpgrade} featureName="Saved Projects" requiredPlan="STANDARD" />
        <Card className="rounded-2xl border-slate-100 p-5 bg-gradient-to-r from-blue-50 via-cyan-50 to-emerald-50">
          <h1 className="text-2xl font-black text-slate-900">Saved Projects</h1>
          <p className="text-sm text-slate-500 mt-1">Lưu tiến trình research để quay lại làm tiếp mà không mất flow.</p>
          <div className="space-y-3 mt-4">
            {!canUseSavedProjects ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4">
                <p className="text-sm text-slate-600 mb-3">Bạn cần nâng cấp để mở Saved Projects.</p>
                <Button className="bg-blue-500 hover:bg-blue-600" onClick={() => setOpenUpgrade(true)}>Nâng cấp để mở khóa</Button>
              </div>
            ) : projects.length > 0 ? projects.map((project) => (
              <div key={project.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{project.name}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {project.keyword} • {project.market} • {project.timeRange} • {formatTime(new Date(project.updatedAt).toISOString())}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => removeProject(project.id)}>Xóa</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge className="bg-blue-50 text-blue-700 border border-blue-200">{project.totalResults} kết quả</Badge>
                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">Min views {formatNumber(project.minViews)}</Badge>
                  <Badge className="bg-violet-50 text-violet-700 border border-violet-200">Min subs {formatNumber(project.minSubs)}</Badge>
                </div>
              </div>
            )) : (
              <p className="text-sm text-slate-500">Chưa có project nào. Vào màn hình Tìm Ngách và bấm “Tạo File Quét”.</p>
            )}
          </div>
        </Card>

        <Card className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm">
          <h2 className="font-bold text-slate-900">Competitor Watchlist</h2>
          <div className="space-y-3 mt-3">
            {!canUseSavedProjects ? (
              <p className="text-sm text-slate-500">Nâng cấp gói để theo dõi watchlist lâu dài.</p>
            ) : watchlist.length > 0 ? watchlist.map((channel) => (
              <div key={channel.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{channel.title}</p>
                  <p className="text-xs text-slate-500">
                    {formatNumber(channel.subscriberCount)} subs • view/sub {channel.viewSubRatio.toFixed(2)}x
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => removeWatchlistChannel(channel.id)}>Bỏ theo dõi</Button>
              </div>
            )) : (
              <p className="text-sm text-slate-500">Bạn chưa thêm kênh nào vào watchlist.</p>
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
