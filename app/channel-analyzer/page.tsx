'use client';

import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart2, Loader2, Search, Users2, Save, Download } from 'lucide-react';
import { useApiKeyStore } from '@/lib/store/api-key-store';
import { toast } from '@/hooks/use-toast';
import { formatDateTimeVN, formatNumber } from '@/lib/utils/format';
import Image from 'next/image';
import { useUiStore } from '@/lib/store/ui-store';
import { UpgradeDialog } from '@/components/common/UpgradeDialog';
import { AnalyzedChannelPayload, DataKind } from '@/lib/server/channel-analysis/types';

const kindMap: Record<DataKind, { label: string; className: string }> = {
  REAL_API: { label: 'Dữ liệu thật từ API', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  CALCULATED: { label: 'Tính toán nội bộ', className: 'bg-blue-50 text-blue-700 border border-blue-200' },
  ESTIMATED: { label: 'Estimated / AI-assisted', className: 'bg-amber-50 text-amber-700 border border-amber-200' },
};

const KindBadge = ({ kind }: { kind: DataKind }) => (
  <Badge className={kindMap[kind].className}>{kindMap[kind].label}</Badge>
);

export default function ChannelAnalyzerPage() {
  const { getKey } = useApiKeyStore();
  const [channelInput, setChannelInput] = useState('');
  const [compareInput, setCompareInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mainChannel, setMainChannel] = useState<AnalyzedChannelPayload | null>(null);
  const [compareChannel, setCompareChannel] = useState<AnalyzedChannelPayload | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [missingKeyBanner, setMissingKeyBanner] = useState(false);
  const [openUpgrade, setOpenUpgrade] = useState(false);
  const { hasFeature } = useUiStore();
  const canAnalyze = hasFeature('channelAnalyzer');

  const handleAnalyze = async () => {
    if (!channelInput.trim()) return;
    if (!canAnalyze) {
      setOpenUpgrade(true);
      return;
    }

    const clientApiKey = getKey('youtube') || undefined;

    setLoading(true);
    setErrorMessage('');
    setMissingKeyBanner(false);
    try {
      const response = await fetch('/api/channel-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelInput,
          compareInput,
          clientApiKey,
        }),
      });
      const json = (await response.json()) as {
        ok?: boolean;
        data?: { main?: AnalyzedChannelPayload; compare?: AnalyzedChannelPayload | null };
        message?: string;
        errorCode?: string;
        hint?: string;
      };
      if (!response.ok || !json.ok || !json.data?.main) {
        if (json.errorCode === 'MISSING_YOUTUBE_API_KEY') {
          setMissingKeyBanner(true);
        }
        throw new Error(json.hint || json.message || 'Không lấy được dữ liệu kênh.');
      }

      setMainChannel(json.data.main);
      setCompareChannel(json.data.compare || null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không lấy được dữ liệu kênh.';
      setErrorMessage(message);
      toast({
        title: 'Phân tích thất bại',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSnapshot = () => {
    if (!mainChannel) return;
    const key = mainChannel.snapshot.saveKey;
    localStorage.setItem(key, JSON.stringify(mainChannel));
    toast({
      title: 'Đã lưu snapshot',
      description: `Snapshot được lưu với key: ${key}`,
    });
  };

  const handleExportJson = () => {
    if (!mainChannel) return;
    const blob = new Blob([JSON.stringify(mainChannel, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${mainChannel.input.query || 'channel'}-analysis.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <UpgradeDialog
          open={openUpgrade}
          onOpenChange={setOpenUpgrade}
          featureName={canAnalyze ? 'AI Idea Generator' : 'Phân Tích Kênh'}
          requiredPlan={canAnalyze ? 'PRO' : 'BASIC'}
        />
        <Card className="rounded-2xl border-slate-100 p-5 bg-gradient-to-r from-blue-50 via-indigo-50 to-violet-50">
          <div className="flex items-center gap-2 text-slate-900">
            <BarChart2 className="w-5 h-5 text-blue-500" />
            <h1 className="text-2xl font-black">Phân Tích Kênh Chuyên Sâu</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Input hợp lệ: channel URL, @handle hoặc channel ID. Tất cả chỉ số đều gắn nhãn nguồn dữ liệu.
          </p>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 mt-4">
            <Input
              value={channelInput}
              onChange={(e) => setChannelInput(e.target.value)}
              placeholder="Kênh chính: UC... hoặc @channel"
              className="h-11 rounded-xl border-slate-300 bg-white shadow-sm"
            />
            <Input
              value={compareInput}
              onChange={(e) => setCompareInput(e.target.value)}
              placeholder="Kênh so sánh (tuỳ chọn)"
              className="h-11 rounded-xl border-slate-300 bg-white shadow-sm"
            />
            <Button onClick={handleAnalyze} disabled={loading} className="h-11 rounded-xl bg-blue-500 hover:bg-blue-600 shadow-sm">
              {loading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Search className="w-4 h-4 mr-1.5" />}
              {canAnalyze ? (loading ? 'Đang phân tích...' : 'Phân Tích Ngay') : 'Nâng cấp để dùng'}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <KindBadge kind="REAL_API" />
            <KindBadge kind="CALCULATED" />
            <KindBadge kind="ESTIMATED" />
          </div>
        </Card>

        {missingKeyBanner ? (
          <Card className="rounded-2xl border-amber-200 bg-amber-50 p-5 shadow-sm">
            <p className="font-semibold text-amber-800">Thiếu YouTube API key</p>
            <p className="text-sm text-amber-700 mt-1">
              Để chạy ổn định và không bị Service Unavailable, bạn thêm key tại mục API Keys. Hệ thống sẽ tự fallback theo thứ tự:
              server key trước, nếu không có thì dùng client key.
            </p>
          </Card>
        ) : null}

        {errorMessage ? (
          <Card className="rounded-2xl border-rose-200 bg-rose-50 p-5 shadow-sm">
            <p className="font-semibold text-rose-700">Không thể phân tích kênh</p>
            <p className="text-sm text-rose-700 mt-1">{errorMessage}</p>
          </Card>
        ) : null}

        {!loading && !mainChannel && !errorMessage ? (
          <Card className="rounded-2xl border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-slate-700 font-semibold">Chưa có dữ liệu phân tích</p>
            <p className="text-sm text-slate-500 mt-1">Nhập kênh chính và bấm Phân Tích Ngay để xem report 10 phần.</p>
          </Card>
        ) : null}

        {mainChannel ? (
          <>
            <Card className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-black text-slate-900">1. Channel Overview</h2>
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="rounded-xl" onClick={handleSaveSnapshot}><Save className="w-4 h-4 mr-1.5" />Save Snapshot</Button>
                  <Button variant="outline" className="rounded-xl" onClick={handleExportJson}><Download className="w-4 h-4 mr-1.5" />Export JSON</Button>
                </div>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-[120px_1fr] gap-4 mt-3">
                <Image src={mainChannel.overview.avatarUrl.value || 'https://placehold.co/120x120/png'} alt={mainChannel.overview.channelName.value} width={120} height={120} className="rounded-xl border border-slate-200 w-[120px] h-[120px]" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-xl border border-slate-200 p-3 bg-slate-50"><p className="text-xs text-slate-500">Tên kênh</p><p className="font-bold text-slate-900">{mainChannel.overview.channelName.value}</p></div>
                  <div className="rounded-xl border border-slate-200 p-3 bg-slate-50"><p className="text-xs text-slate-500">Subscribers</p><p className="font-bold text-slate-900">{formatNumber(mainChannel.overview.subscriberCount.value)}</p></div>
                  <div className="rounded-xl border border-slate-200 p-3 bg-slate-50"><p className="text-xs text-slate-500">Total Views</p><p className="font-bold text-slate-900">{formatNumber(mainChannel.overview.totalViews.value)}</p></div>
                  <div className="rounded-xl border border-slate-200 p-3 bg-slate-50"><p className="text-xs text-slate-500">Total Videos</p><p className="font-bold text-slate-900">{formatNumber(mainChannel.overview.totalVideos.value)}</p></div>
                  <div className="rounded-xl border border-slate-200 p-3 bg-slate-50"><p className="text-xs text-slate-500">Quốc gia</p><p className="font-bold text-slate-900">{mainChannel.overview.country.value}</p></div>
                  <div className="rounded-xl border border-slate-200 p-3 bg-slate-50"><p className="text-xs text-slate-500">Hoạt động gần đây</p><p className="font-bold text-slate-900">{mainChannel.overview.activeStatus.value}</p></div>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <Card className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm">
                <h2 className="text-lg font-black text-slate-900">2. Content Analysis</h2>
                <div className="mt-3 flex items-center gap-2"><KindBadge kind={mainChannel.contentAnalysis.niche.kind} /></div>
                <p className="text-sm text-slate-700 mt-2">Ngách chính: <span className="font-bold">{mainChannel.contentAnalysis.niche.value}</span></p>
                <p className="text-sm text-slate-700 mt-2">Audience (Estimated): {mainChannel.contentAnalysis.audienceEstimated.value}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {mainChannel.contentAnalysis.mainThemes.value.map((theme) => <Badge key={theme} className="bg-slate-100 text-slate-700 border border-slate-200">{theme}</Badge>)}
                </div>
              </Card>

              <Card className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm">
                <h2 className="text-lg font-black text-slate-900">3. Top Video Performance</h2>
                <div className="mt-3 space-y-2">
                  {mainChannel.topPerformance.topViews.slice(0, 8).map((video) => (
                    <a key={video.id} href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 p-3 flex items-center gap-3 hover:border-blue-300">
                      <Image src={video.thumbnailUrl || 'https://placehold.co/160x90/png'} alt={video.title} width={120} height={68} className="rounded-md w-[120px] h-[68px] object-cover" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 line-clamp-2">{video.title}</p>
                        <p className="text-xs text-slate-500 mt-1">{formatNumber(video.viewCount)} views</p>
                      </div>
                    </a>
                  ))}
                </div>
              </Card>

              <Card className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm">
                <h2 className="text-lg font-black text-slate-900">4. Upload Pattern</h2>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-slate-200 p-3"><p className="text-xs text-slate-500">Uploads/Week</p><p className="font-bold text-slate-900">{mainChannel.uploadPattern.uploadsPerWeek.value}</p></div>
                  <div className="rounded-xl border border-slate-200 p-3"><p className="text-xs text-slate-500">Consistency</p><p className="font-bold text-slate-900">{mainChannel.uploadPattern.consistencyScore.value}</p></div>
                </div>
                <p className="text-xs text-slate-500 mt-3">Giờ VN phổ biến: {mainChannel.uploadPattern.popularHoursVn.value.map((h) => `${h.hour}h(${h.count})`).join(' • ')}</p>
              </Card>

              <Card className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm">
                <h2 className="text-lg font-black text-slate-900">5. Thumbnail DNA</h2>
                <div className="mt-3 flex items-center gap-2"><KindBadge kind={mainChannel.thumbnailDna.faceUsageEstimated.kind} /></div>
                <div className="mt-3 space-y-2 text-sm text-slate-700">
                  <p>Average Resolution: <span className="font-semibold">{mainChannel.thumbnailDna.averageResolution.value}</span></p>
                  <p>Uniformity Score: <span className="font-semibold">{mainChannel.thumbnailDna.uniformityScore.value}</span></p>
                  <p>{mainChannel.thumbnailDna.faceUsageEstimated.value}</p>
                  <p>{mainChannel.thumbnailDna.textDensityEstimated.value}</p>
                </div>
              </Card>
              <Card className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm">
                <h2 className="text-lg font-black text-slate-900">6. Content Gaps</h2>
                <div className="mt-3 flex items-center gap-2"><KindBadge kind={mainChannel.contentGap.uncoveredTopicsEstimated.kind} /></div>
                <p className="text-sm text-slate-700 mt-2">Topics chưa phủ tốt: {mainChannel.contentGap.uncoveredTopicsEstimated.value.join(', ') || 'Chưa phát hiện thiếu rõ ràng'}</p>
                <div className="mt-3 space-y-1">
                  {mainChannel.contentGap.expansionIdeasEstimated.value.slice(0, 5).map((idea) => (
                    <div key={idea} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{idea}</div>
                  ))}
                </div>
              </Card>

              <Card className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm">
                <h2 className="text-lg font-black text-slate-900">7. Strategic Evaluation</h2>
                <div className="mt-3 space-y-2 text-sm text-slate-700">
                  <p>Competition Score: <span className="font-semibold">{mainChannel.strategicEvaluation.competitionScore.value}</span></p>
                  <p>Learning Value: <span className="font-semibold">{mainChannel.strategicEvaluation.learningValueScore.value}</span></p>
                  <p>Direct Competition Difficulty: <span className="font-semibold">{mainChannel.strategicEvaluation.directCompetitionDifficulty.value}</span></p>
                  <p>Saturation (Estimated): <span className="font-semibold">{mainChannel.strategicEvaluation.saturationScoreEstimated.value}</span></p>
                </div>
                <div className="mt-3">
                  <p className="text-xs text-slate-500">Strengths</p>
                  {mainChannel.strategicEvaluation.strengths.value.map((item) => <p key={item} className="text-sm text-slate-700 mt-1">- {item}</p>)}
                </div>
              </Card>

              <Card className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm xl:col-span-2">
                <div className="flex items-center gap-2">
                  <Users2 className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-black text-slate-900">8. Similar Channels</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mt-3">
                  {mainChannel.similarChannels.slice(0, 10).map((item) => (
                    <a key={item.channelId} href={`https://www.youtube.com/channel/${item.channelId}`} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 hover:border-blue-300">
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{formatNumber(item.subscriberCount)} subs · {formatNumber(item.totalViews)} views</p>
                    </a>
                  ))}
                </div>
              </Card>

              <Card className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm xl:col-span-2">
                <h2 className="text-lg font-black text-slate-900">9. Compare With Another Channel</h2>
                {mainChannel.compare.enabled && mainChannel.compare.summary && compareChannel ? (
                  <Table className="mt-3">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Metric</TableHead>
                        <TableHead>Kênh chính</TableHead>
                        <TableHead>Kênh so sánh</TableHead>
                        <TableHead>Kết luận</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mainChannel.compare.summary.map((row) => (
                        <TableRow key={row.metric}>
                          <TableCell>{row.metric}</TableCell>
                          <TableCell>{typeof row.main === 'number' ? formatNumber(row.main) : row.main}</TableCell>
                          <TableCell>{typeof row.compare === 'number' ? formatNumber(row.compare) : row.compare}</TableCell>
                          <TableCell>{row.winner}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-slate-500 mt-3">Chưa nhập kênh so sánh.</p>
                )}
              </Card>

              <Card className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm xl:col-span-2">
                <h2 className="text-lg font-black text-slate-900">10. Snapshot Save Support</h2>
                <p className="text-sm text-slate-600 mt-2">
                  Snapshot tạo lúc: {formatDateTimeVN(mainChannel.snapshot.createdAt)} · Key: {mainChannel.snapshot.saveKey}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" className="rounded-xl" onClick={handleSaveSnapshot}><Save className="w-4 h-4 mr-1.5" />Lưu local snapshot</Button>
                  <Button variant="outline" className="rounded-xl" onClick={handleExportJson}><Download className="w-4 h-4 mr-1.5" />Xuất JSON</Button>
                </div>
              </Card>
            </div>
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}
