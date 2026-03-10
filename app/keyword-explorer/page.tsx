'use client';

import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Sparkles, Shuffle, Loader2 } from 'lucide-react';
import { generateIdeaAngles, generateKeywordExpansions } from '@/lib/services/idea-generator';
import { useApiKeyStore } from '@/lib/store/api-key-store';
import { NicheResult } from '@/lib/services/youtube';
import { formatNumber } from '@/lib/utils/format';
import { toast } from '@/hooks/use-toast';
import { useUiStore } from '@/lib/store/ui-store';
import { UpgradeDialog } from '@/components/common/UpgradeDialog';

const MARKETS = ['US', 'AU', 'CA', 'GB', 'DE', 'JP', 'KR', 'SG', 'VN', 'ID', 'IN', 'BR'];

export default function KeywordExplorerPage() {
  const { getKey } = useApiKeyStore();
  const [keyword, setKeyword] = useState('');
  const [market, setMarket] = useState('US');
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<Array<{ title: string; views: number; channel: string }>>([]);
  const [openUpgrade, setOpenUpgrade] = useState(false);
  const { hasFeature } = useUiStore();
  const canUseKeywordExplorer = hasFeature('keywordExplorer');

  const keywordIdeas = useMemo(() => generateKeywordExpansions(keyword, market), [keyword, market]);
  const angleIdeas = useMemo(() => generateIdeaAngles(keyword, market), [keyword, market]);

  const randomKeyword = () => {
    const pool = ['dark psychology', 'faceless motivation', 'ai animation', 'make money online', 'self discipline'];
    setKeyword(pool[Math.floor(Math.random() * pool.length)]);
  };

  const handleExplore = async () => {
    if (!keyword.trim()) return;
    if (!canUseKeywordExplorer) {
      setOpenUpgrade(true);
      return;
    }
    const clientApiKey = getKey('youtube') || undefined;

    setLoading(true);
    try {
      const response = await fetch('/api/youtube-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: {
            q: keyword,
            regionCode: market,
            maxResults: 12,
          },
          clientApiKey,
        }),
      });
      const json = (await response.json()) as { ok?: boolean; data?: NicheResult[]; message?: string };
      if (!response.ok || !json.ok) {
        throw new Error(json.message || 'Không thể mở rộng keyword.');
      }
      const result = json.data || [];

      setInsights(
        result.slice(0, 8).map((item) => ({
          title: item.title,
          views: item.viewCount,
          channel: item.channelTitle,
        }))
      );
    } catch (error) {
      console.error(error);
      toast({
        title: 'Không thể mở rộng keyword',
        description: 'Vui lòng kiểm tra API quota hoặc thử lại.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <UpgradeDialog open={openUpgrade} onOpenChange={setOpenUpgrade} featureName="Keyword Explorer" requiredPlan="STANDARD" />
        <Card className="rounded-2xl border-slate-100 p-5 bg-gradient-to-r from-blue-50 via-violet-50 to-fuchsia-50">
          <h1 className="text-2xl font-black text-slate-900">Keyword Explorer</h1>
          <p className="text-sm text-slate-500 mt-1">Mở rộng keyword theo market, góc nội dung và cơ hội triển khai.</p>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_150px_160px] gap-3 mt-4">
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Nhập keyword gốc..."
              className="h-11 rounded-xl border-slate-300 bg-white shadow-sm"
            />
            <Select value={market} onValueChange={setMarket}>
              <SelectTrigger className="h-11 rounded-xl border-slate-300 bg-white shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 bg-white/95">
                {MARKETS.map((item) => (
                  <SelectItem key={item} value={item}>{item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" className="h-11 rounded-xl border-slate-300 bg-white" onClick={randomKeyword}>
              <Shuffle className="w-4 h-4 mr-1.5" />
              Random
            </Button>
            <Button type="button" className="h-11 rounded-xl bg-blue-500 hover:bg-blue-600 shadow-sm" onClick={handleExplore} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Search className="w-4 h-4 mr-1.5" />}
              {canUseKeywordExplorer ? 'Explore' : 'Nâng cấp để dùng'}
            </Button>
          </div>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm">
            <h2 className="font-bold text-slate-900">Keyword Variants</h2>
            <div className="flex flex-wrap gap-2 mt-3">
              {keywordIdeas.length > 0 ? keywordIdeas.map((item) => (
                <Badge key={item} className="bg-slate-100 text-slate-700 border border-slate-200">{item}</Badge>
              )) : <p className="text-sm text-slate-500">Nhập keyword để xem gợi ý.</p>}
            </div>
          </Card>
          <Card className="rounded-2xl border-slate-100 p-5 bg-gradient-to-br from-violet-50 to-fuchsia-50 shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-500" />
              <h2 className="font-bold text-slate-900">Idea Angles</h2>
            </div>
            <div className="space-y-2 mt-3">
              {angleIdeas.length > 0 ? angleIdeas.map((item) => (
                <div key={item} className="text-sm text-slate-700 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  {item}
                </div>
              )) : <p className="text-sm text-slate-500">Chưa có angle.</p>}
            </div>
          </Card>
        </div>

        <Card className="rounded-2xl border-slate-100 p-5 bg-white shadow-sm">
          <h2 className="font-bold text-slate-900">Top tín hiệu từ YouTube search</h2>
          <div className="space-y-2 mt-3">
            {insights.length > 0 ? insights.map((item) => (
              <div key={item.title} className="rounded-lg border border-slate-100 bg-white px-3 py-2 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-800 line-clamp-1">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.channel}</p>
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">{formatNumber(item.views)} views</Badge>
              </div>
            )) : (
              <p className="text-sm text-slate-500">Bấm Explore để lấy dữ liệu thật từ YouTube.</p>
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
