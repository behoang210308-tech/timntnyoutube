
'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Loader2, Sparkles, Flame, Plus, Youtube, Globe2, Languages, Trophy, ChevronRight, CalendarClock, Film, Gem, Eye, Download } from 'lucide-react';
import { useState } from 'react';
import { useApiKeyStore } from '@/lib/store/api-key-store';
import { NicheResult, SearchFilters } from '@/lib/services/youtube';
import { toast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTimeVN, formatDateVN, formatNumber, formatTime, parseDuration } from '@/lib/utils/format';
import Image from 'next/image';
import { Progress } from '@/components/ui/progress';
import { useResearchStore } from '@/lib/store/research-store';
import { useUiStore } from '@/lib/store/ui-store';
import { UpgradeDialog } from '@/components/common/UpgradeDialog';

interface TrendsInsights {
  trendScore: number;
  momentum: number;
  relatedKeywords: string[];
  expandedKeywords: string[];
}

interface NicheProfile {
  include: string[];
  exclude: string[];
}

const DEFAULT_NICHE_PROFILE: NicheProfile = {
  include: [],
  exclude: ['live score', 'football', 'nba', 'weather', 'election', 'lottery', 'celebrity', 'transfer news'],
};

const NICHE_PROFILES: Array<{ triggers: string[]; profile: NicheProfile }> = [
  {
    triggers: ['ai', 'automation', 'chatgpt', 'n8n', 'agent', 'prompt'],
    profile: {
      include: ['ai', 'automation', 'chatgpt', 'prompt', 'workflow', 'tool'],
      exclude: ['football', 'basketball', 'lottery', 'celebrity'],
    },
  },
  {
    triggers: ['finance', 'money', 'crypto', 'invest', 'stock', 'trading'],
    profile: {
      include: ['finance', 'money', 'invest', 'trading', 'crypto', 'stock'],
      exclude: ['football', 'entertainment', 'gossip'],
    },
  },
  {
    triggers: ['health', 'fitness', 'diet', 'workout'],
    profile: {
      include: ['health', 'fitness', 'diet', 'workout', 'nutrition'],
      exclude: ['football', 'transfer', 'gossip'],
    },
  },
  {
    triggers: ['gaming', 'game', 'roblox', 'minecraft'],
    profile: {
      include: ['game', 'gaming', 'roblox', 'minecraft', 'playthrough'],
      exclude: ['stock market', 'election'],
    },
  },
];

const normalizeTerm = (value: string) => value.toLowerCase().trim();

const inferNicheProfile = (keyword: string): NicheProfile => {
  const normalized = normalizeTerm(keyword);
  const matched = NICHE_PROFILES.find((item) => item.triggers.some((token) => normalized.includes(token)));
  if (!matched) return DEFAULT_NICHE_PROFILE;
  return {
    include: Array.from(new Set([...DEFAULT_NICHE_PROFILE.include, ...matched.profile.include])),
    exclude: Array.from(new Set([...DEFAULT_NICHE_PROFILE.exclude, ...matched.profile.exclude])),
  };
};

const filterTrendTermsByContext = (keyword: string, terms: string[], profile: NicheProfile) => {
  const seedTokens = normalizeTerm(keyword).split(/\s+/).filter((token) => token.length > 2);
  const includeTokens = profile.include.map(normalizeTerm);
  const excludeTokens = profile.exclude.map(normalizeTerm);

  const scored = terms
    .map((term) => {
      const normalized = normalizeTerm(term);
      const overlap = seedTokens.filter((token) => normalized.includes(token)).length;
      const includeHit = includeTokens.filter((token) => normalized.includes(token)).length;
      const excludeHit = excludeTokens.some((token) => normalized.includes(token));
      const score = overlap * 3 + includeHit * 2 - (excludeHit ? 4 : 0);
      return { term, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.term);

  if (scored.length >= 6) return Array.from(new Set(scored)).slice(0, 18);
  return Array.from(new Set([...scored, ...terms])).slice(0, 18);
};

const badgeClass: Record<string, string> = {
  'Gold Mine': 'bg-amber-100 text-amber-700 border border-amber-200',
  Saturated: 'bg-cyan-100 text-cyan-700 border border-cyan-200',
  'Rising Star': 'bg-emerald-100 text-emerald-700 border border-emerald-200',
};
const badgeLabel: Record<string, string> = {
  'Gold Mine': 'Mỏ Vàng',
  Saturated: 'Bão Hòa',
  'Rising Star': 'Tăng Trưởng',
};
const getVideoDurationLabel = (duration: string) => {
  const parsed = parseDuration(duration);
  const parts = parsed.split(':').map((part) => Number(part) || 0);
  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }
  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }
  return `0:${String(parts[0]).padStart(2, '0')}`;
};
const RPM_BY_MARKET: Record<string, number> = {
  US: 10,
  AU: 12,
  CA: 9,
  GB: 8,
  DE: 7,
  NL: 7,
  JP: 5,
  KR: 4.5,
  VN: 1.4,
  ID: 1.2,
  IN: 1.1,
  BR: 1.3,
};
const estimateUsd = (views: number, country: string | undefined, fallbackMarket: string) => {
  const rpm = RPM_BY_MARKET[(country || fallbackMarket).toUpperCase()] || 1.6;
  return Number(((views / 1000) * rpm).toFixed(2));
};

const COUNTRY_GROUPS = [
  {
    title: 'RPM cao',
    items: [
      { value: 'AU', label: 'Úc (AU)' },
      { value: 'US', label: 'Mỹ (US)' },
      { value: 'CA', label: 'Canada (CA)' },
      { value: 'NZ', label: 'New Zealand (NZ)' },
      { value: 'GB', label: 'Anh (GB)' },
      { value: 'DE', label: 'Đức (DE)' },
      { value: 'NL', label: 'Hà Lan (NL)' },
    ],
  },
  {
    title: 'RPM trung bình cao',
    items: [
      { value: 'JP', label: 'Nhật (JP)' },
      { value: 'KR', label: 'Hàn (KR)' },
      { value: 'SG', label: 'Singapore (SG)' },
      { value: 'HK', label: 'Hong Kong (HK)' },
    ],
  },
  {
    title: 'RPM trung bình thấp',
    items: [
      { value: 'ID', label: 'Indonesia (ID)' },
      { value: 'VN', label: 'Việt Nam (VN)' },
    ],
  },
  {
    title: 'RPM thấp nhưng view lớn',
    items: [
      { value: 'IN', label: 'Ấn Độ (IN)' },
      { value: 'BR', label: 'Brazil (BR)' },
    ],
  },
];

const TIME_OPTIONS = [
  { value: 'TODAY', label: 'Hôm nay' },
  { value: 'THIS_WEEK', label: 'Tuần này' },
  { value: 'THIS_MONTH', label: 'Tháng này' },
  { value: 'THREE_MONTHS', label: '3 tháng' },
  { value: 'SIX_MONTHS', label: '6 tháng' },
  { value: 'PAST_YEAR', label: '1 năm qua' },
  { value: 'THREE_YEARS', label: '3 năm' },
];

const LANGUAGE_OPTIONS = [
  { code: 'EN', label: 'EN' },
  { code: 'JA', label: 'JP' },
  { code: 'KO', label: 'KR' },
  { code: 'DE', label: 'DE' },
  { code: 'VI', label: 'VN' },
  { code: 'ES', label: 'ES' },
  { code: 'FR', label: 'FR' },
  { code: 'PT', label: 'PT' },
] as const;
type LanguageCode = (typeof LANGUAGE_OPTIONS)[number]['code'];

export default function NicheFinderPage() {
  const { getKey } = useApiKeyStore();
  const { saveProject } = useResearchStore();
  const { hasFeature } = useUiStore();
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<NicheResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<'savedProjects' | null>(null);
  const [trendsInsights, setTrendsInsights] = useState<TrendsInsights | null>(null);
  const [activeLanguage, setActiveLanguage] = useState<LanguageCode | null>(null);
  const [languageLoading, setLanguageLoading] = useState(false);
  
  // Filters
  const [market, setMarket] = useState('US');
  const [timeRange, setTimeRange] = useState('THIS_MONTH');
  const [videoType, setVideoType] = useState('any');
  const [minViews, setMinViews] = useState('');
  const [minSubs, setMinSubs] = useState('');

  const handleLanguageSwitch = async (lang: LanguageCode) => {
    setActiveLanguage(lang);
    const text = keyword.trim();
    if (!text) return;

    setLanguageLoading(true);
    try {
      const response = await fetch('/api/translate-keyword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          targetLang: lang,
        }),
      });
      const json = (await response.json()) as { ok?: boolean; data?: { translatedText?: string }; message?: string };
      if (!response.ok || !json.ok || !json.data?.translatedText) {
        throw new Error(json.message || 'Không thể đổi ngôn ngữ keyword.');
      }
      setKeyword(json.data.translatedText);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể đổi ngôn ngữ keyword.';
      toast({
        title: 'Đổi ngôn ngữ thất bại',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLanguageLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!keyword.trim()) return;

    const clientApiKey = getKey('youtube') || undefined;

    setLoading(true);
    setHasSearched(true);
    setResults([]);

    try {
      // Calculate publishedAfter based on timeRange
      const now = new Date();
      if (timeRange === 'TODAY') now.setDate(now.getDate() - 1);
      if (timeRange === 'THIS_WEEK') now.setDate(now.getDate() - 7);
      if (timeRange === 'THIS_MONTH') now.setMonth(now.getMonth() - 1);
      if (timeRange === 'THREE_MONTHS') now.setMonth(now.getMonth() - 3);
      if (timeRange === 'SIX_MONTHS') now.setMonth(now.getMonth() - 6);
      if (timeRange === 'PAST_YEAR') now.setFullYear(now.getFullYear() - 1);
      if (timeRange === 'THREE_YEARS') now.setFullYear(now.getFullYear() - 3);
      const publishedAfter = now.toISOString();

      let trendsData: TrendsInsights = {
        trendScore: 0,
        momentum: 0,
        relatedKeywords: [],
        expandedKeywords: [],
      };
      const nicheProfile = inferNicheProfile(keyword.trim());

      try {
        const trendsRes = await fetch('/api/trends-insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            keyword: keyword.trim(),
            market,
          }),
        });
        const trendsJson = (await trendsRes.json()) as { ok?: boolean; data?: TrendsInsights };
        if (trendsJson.ok && trendsJson.data) {
          trendsData = trendsJson.data;
        }
      } catch {
        trendsData = {
          trendScore: 0,
          momentum: 0,
          relatedKeywords: [],
          expandedKeywords: [],
        };
      }

      setTrendsInsights(trendsData);

      const baseQueries = [keyword.trim(), `${keyword.trim()} strategy`, `${keyword.trim()} tutorial`];
      const contextualTrendQueries = filterTrendTermsByContext(
        keyword.trim(),
        [...trendsData.expandedKeywords, ...trendsData.relatedKeywords],
        nicheProfile
      );
      const trendQueries = contextualTrendQueries.slice(0, 8);
      const queryPool = videoType === 'short' ? [...baseQueries, `${keyword.trim()} shorts`, ...trendQueries] : [...baseQueries, ...trendQueries];
      const uniqueQueries = Array.from(new Set(queryPool));

      const batchResults = await Promise.allSettled(
        uniqueQueries.map(async (query) => {
          const filters: SearchFilters = {
            q: query,
            regionCode: market,
            publishedAfter,
            videoDuration: videoType === 'short' ? 'short' : (videoType === 'long' ? 'long' : 'any'),
            maxResults: 50,
          };
          const response = await fetch('/api/youtube-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filters,
              clientApiKey,
            }),
          });
          const json = (await response.json()) as { ok?: boolean; data?: NicheResult[]; message?: string };
          if (!response.ok || !json.ok) {
            throw new Error(json.message || 'Không thể lấy dữ liệu YouTube.');
          }
          return json.data || [];
        })
      );

      const successBatches = batchResults
        .filter((result): result is PromiseFulfilledResult<NicheResult[]> => result.status === 'fulfilled')
        .map((result) => result.value);
      const failedMessages = batchResults
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map((result) => (result.reason instanceof Error ? result.reason.message : 'Lỗi YouTube API'));

      if (successBatches.length === 0) {
        throw new Error(failedMessages[0] || 'Không thể lấy dữ liệu YouTube.');
      }

      let data = Array.from(
        new Map(
          successBatches
            .flat()
            .sort((a, b) => b.scores.goldMine - a.scores.goldMine)
            .map((item) => [item.id, item])
        ).values()
      );

      const trendTerms = Array.from(new Set([keyword.trim(), ...contextualTrendQueries]))
        .map((item) => item.toLowerCase())
        .filter(Boolean);

      data = data
        .map((item) => {
          const title = item.title.toLowerCase();
          const matchCount = trendTerms.filter((term) => title.includes(term)).length;
          const includeHit = nicheProfile.include.filter((term) => title.includes(term)).length;
          const excludeHit = nicheProfile.exclude.some((term) => title.includes(term));
          const trendBoost = Math.min(24, matchCount * 4 + Math.round(trendsData.trendScore * 0.08));
          const nicheBoost = includeHit * 3 - (excludeHit ? 8 : 0);
          const adjustedScore = Math.min(100, Math.max(0, item.scores.goldMine + trendBoost + nicheBoost));
          const adjustedBadges = [...item.badges];
          if ((trendBoost >= 10 || trendsData.momentum >= 30) && !adjustedBadges.includes('Rising Star')) {
            adjustedBadges.push('Rising Star');
          }
          return {
            ...item,
            badges: adjustedBadges,
            scores: {
              ...item.scores,
              goldMine: adjustedScore,
            },
          };
        })
        .sort((a, b) => b.scores.goldMine - a.scores.goldMine);
      
      // Client-side filtering
      if (minViews) {
        const minViewsNum = parseInt(minViews);
        if (!isNaN(minViewsNum)) {
          data = data.filter(item => item.viewCount >= minViewsNum);
        }
      }

      if (minSubs) {
        const minSubsNum = parseInt(minSubs);
        if (!isNaN(minSubsNum)) {
          data = data.filter(item => item.channel.subscriberCount >= minSubsNum);
        }
      }

      if (market !== 'GLOBAL') {
        data = data.filter((item) => (item.channel.country || '').toUpperCase() === market);
      }

      setResults(data);

      if (data.length === 0) {
        toast({
          title: "No results found",
          description: "Try adjusting your filters or keyword.",
        });
      } else if (failedMessages.length > 0) {
        toast({
          title: 'Đã lấy dữ liệu một phần',
          description: failedMessages[0],
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Không thể lấy dữ liệu YouTube.';
      if (message.toLowerCase().includes('đăng nhập')) {
        toast({
          title: 'Cần đăng nhập',
          description: 'Bạn cần đăng nhập để dùng tính năng tìm ngách.',
          variant: 'destructive',
        });
        window.location.assign(`/login?returnTo=${encodeURIComponent('/timsieungach')}`);
        return;
      }
      toast({
        title: 'Error searching',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProject = () => {
    if (!hasFeature('savedProjects')) {
      setUpgradeFeature('savedProjects');
      return;
    }

    if (!keyword.trim() || results.length === 0) {
      toast({
        title: 'Chưa có dữ liệu để lưu',
        description: 'Bạn cần quét ngách trước khi tạo file.',
      });
      return;
    }

    saveProject({
      name: `Project - ${keyword} - ${market}`,
      keyword,
      market,
      timeRange,
      videoType,
      minViews: parseInt(minViews || '0', 10) || 0,
      minSubs: parseInt(minSubs || '0', 10) || 0,
      totalResults: results.length,
      topResults: results.slice(0, 20),
    });

    toast({
      title: 'Đã lưu project',
      description: 'Bạn có thể xem lại ở Saved Projects.',
    });
  };

  const avgGoldScore = results.length
    ? Math.round(results.reduce((sum, item) => sum + item.scores.goldMine, 0) / results.length)
    : 0;
  const isNewChannel = (createdAt?: string) => {
    if (!createdAt) return false;
    const created = new Date(createdAt).getTime();
    if (Number.isNaN(created)) return false;
    return Date.now() - created <= 1000 * 60 * 60 * 24 * 365;
  };
  const totalGoldMines = results.filter((item) => item.scores.goldMine >= 70).length;
  const totalNewChannels = results.filter((item) => isNewChannel(item.channel.createdAt)).length;
  const totalSmallChannels = results.filter((item) => item.channel.subscriberCount > 0 && item.channel.subscriberCount < 10000).length;
  const totalHighViral = results.filter((item) => item.scores.viewSubRatio >= 3).length;
  const exportCsv = () => {
    const header = ['Video', 'Kenh', 'Views', 'Subs', 'VS', 'EstUSD', 'NgayTaoKenh', 'TongVideoKenh'];
    const rows = results.map((item) => [
      item.title,
      item.channelTitle,
      String(item.viewCount),
      String(item.channel.subscriberCount),
      `${item.scores.viewSubRatio.toFixed(2)}x`,
      String(estimateUsd(item.viewCount, item.channel.country, market)),
      item.channel.createdAt ? formatDateVN(item.channel.createdAt) : '',
      String(item.channel.videoCount),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `radar-video-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <UpgradeDialog
          open={upgradeFeature !== null}
          onOpenChange={(open) => {
            if (!open) setUpgradeFeature(null);
          }}
          featureName="Saved Projects"
          requiredPlan="STANDARD"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[38px] leading-none font-black text-slate-900 flex items-center gap-2">
              <Youtube className="w-8 h-8 text-red-500" />
              Tìm Ngách <span className="text-red-500">YouTube</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1.5 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Phát hiện cơ hội · Bứt phá doanh thu
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 inline-flex items-center gap-1.5">
              <Globe2 className="w-4 h-4 text-blue-500" />
              USD
              <ChevronRight className="w-3 h-3 rotate-90 text-slate-400" />
            </button>
            <button className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 inline-flex items-center gap-1.5">
              <Languages className="w-4 h-4 text-rose-500" />
              VN
              <ChevronRight className="w-3 h-3 rotate-90 text-slate-400" />
            </button>
          </div>
        </div>

        <Card className="rounded-2xl border-blue-100 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-[34px] leading-none font-black text-slate-900">Tìm Ngách Tiềm Năng</h2>
            <Button className="rounded-xl bg-emerald-500 hover:bg-emerald-600" onClick={handleSaveProject}>
              <Plus className="w-4 h-4 mr-1" />
              {hasFeature('savedProjects') ? 'Tạo File Quét' : 'Nâng cấp để lưu'}
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {LANGUAGE_OPTIONS.map((lang) => (
              <Badge
                key={lang.code}
                onClick={() => handleLanguageSwitch(lang.code)}
                className={`cursor-pointer border transition ${
                  activeLanguage === lang.code
                    ? 'bg-blue-500 border-blue-500 text-white hover:bg-blue-600'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {lang.label}
              </Badge>
            ))}
            {languageLoading ? <Badge className="bg-amber-50 text-amber-700 border border-amber-200">Đang dịch...</Badge> : null}
          </div>
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
            <Input
              id="keyword"
              placeholder="Nhập keyword hoặc chủ đề..."
              className="pl-10 h-12 bg-white border-slate-300 rounded-xl text-base"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setActiveLanguage(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            <Select value={market} onValueChange={setMarket}>
              <SelectTrigger className="rounded-xl border-slate-300 bg-slate-100 text-slate-800">
                <SelectValue placeholder="Chọn quốc gia" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 bg-white/95">
                <SelectItem value="GLOBAL">Toàn cầu</SelectItem>
                <SelectSeparator />
                {COUNTRY_GROUPS.map((group) => (
                  <SelectGroup key={group.title}>
                    <SelectLabel className="text-[11px] uppercase tracking-wide text-slate-500">{group.title}</SelectLabel>
                    {group.items.map((country) => (
                      <SelectItem key={country.value} value={country.value}>
                        {country.label}
                      </SelectItem>
                    ))}
                    <SelectSeparator />
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Min Views"
              value={minViews}
              onChange={(e) => setMinViews(e.target.value)}
              className="rounded-xl border-slate-300 bg-slate-100"
            />
            <Input
              type="number"
              placeholder="Min Subs"
              value={minSubs}
              onChange={(e) => setMinSubs(e.target.value)}
              className="rounded-xl border-slate-300 bg-slate-100"
            />
            <Select value={videoType} onValueChange={setVideoType}>
              <SelectTrigger className="rounded-xl border-slate-300 bg-slate-100 text-slate-800">
                <SelectValue placeholder="Loại video" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 bg-white/95">
                <SelectItem value="any">Tất cả</SelectItem>
                <SelectItem value="long">Long-form</SelectItem>
                <SelectItem value="short">Shorts</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {TIME_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTimeRange(option.value)}
                className={`h-10 px-4 rounded-xl border text-sm font-semibold transition ${
                  timeRange === option.value
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <Button size="lg" className="mt-3 h-11 w-full rounded-xl px-7 bg-emerald-500 hover:bg-emerald-600 text-base" onClick={handleSearch} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Search className="mr-2 h-5 w-5" />}
            {loading ? 'Đang quét...' : 'Quét Ngách Ngay'}
          </Button>
        </Card>

        {hasSearched ? (
          <Card className="rounded-2xl border-amber-100 bg-gradient-to-br from-amber-50 to-yellow-50 p-5">
            <div className="flex items-center gap-2 text-amber-700 font-bold text-2xl">
              <Trophy className="w-6 h-6" />
              GOLD MINE SCORE
            </div>
            <div className="mt-4 flex items-end gap-2">
              <span className="text-5xl font-black text-slate-900">{avgGoldScore || 0}</span>
              <span className="text-lg text-slate-500 mb-1">/100</span>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-4 text-xs">
              <div className="text-center">
                <p className="text-slate-500">View/Sub</p>
                <Progress value={Math.min(100, Math.round((results[0]?.scores.viewSubRatio || 0) * 10))} className="h-2 mt-1" />
              </div>
              <div className="text-center">
                <p className="text-slate-500">Gold Mine</p>
                <Progress value={avgGoldScore} className="h-2 mt-1" />
              </div>
              <div className="text-center">
                <p className="text-slate-500">Google Trends</p>
                <Progress value={trendsInsights?.trendScore || 0} className="h-2 mt-1" />
              </div>
              <div className="text-center">
                <p className="text-slate-500">Momentum</p>
                <Progress value={Math.min(100, Math.max(0, (trendsInsights?.momentum || 0) + 50))} className="h-2 mt-1" />
              </div>
            </div>
            {trendsInsights && trendsInsights.relatedKeywords.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {trendsInsights.relatedKeywords.slice(0, 8).map((term) => (
                  <Badge key={term} className="bg-white border border-amber-200 text-amber-700">
                    {term}
                  </Badge>
                ))}
              </div>
            ) : null}
          </Card>
        ) : null}

        {results.length > 0 ? (
          <Card className="rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-white via-amber-50/50 to-yellow-50 p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                  <Flame className="w-6 h-6 text-orange-500" />
                  GOLD MINE DETECTION REPORT
                </h3>
                <p className="text-sm text-slate-600 mt-1">Kênh mới + Subs thấp + Video viral = cơ hội tốt để triển khai.</p>
              </div>
              <Badge className="bg-amber-500 text-white border border-amber-600">Niche Phù Hợp</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 mt-4">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold text-slate-500">TOTAL VIDEOS</p>
                <p className="text-4xl font-black text-slate-900 mt-1">{results.length}</p>
              </div>
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3">
                <p className="text-xs font-semibold text-amber-700">GOLD MINES</p>
                <p className="text-4xl font-black text-amber-700 mt-1">{totalGoldMines}</p>
                <p className="text-xs text-amber-700 mt-1">{results.length ? ((totalGoldMines / results.length) * 100).toFixed(1) : '0'}%</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                <p className="text-xs font-semibold text-blue-700">KÊNH MỚI</p>
                <p className="text-4xl font-black text-blue-700 mt-1">{totalNewChannels}</p>
              </div>
              <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
                <p className="text-xs font-semibold text-violet-700">SMALL CHANNELS</p>
                <p className="text-4xl font-black text-violet-700 mt-1">{totalSmallChannels}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-xs font-semibold text-emerald-700">HIGH VIRAL</p>
                <p className="text-4xl font-black text-emerald-700 mt-1">{totalHighViral}</p>
              </div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 font-semibold mt-4">
              Gold Mine Strategy: Kênh mới (&lt; 1 năm) + ít subs + view/sub cao = cơ hội vàng. Ưu tiên phân tích title, thumbnail và format để replicate nhanh.
            </div>
          </Card>
        ) : null}

        {!hasSearched ? (
          <Card className="rounded-2xl border-dashed border-2 border-slate-200 p-12 text-center text-slate-500 bg-white">
            <Search className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-700">Sẵn sàng quét ngách</h3>
            <p>Nhập keyword và bấm Quét Ngách Ngay để nhận danh sách cơ hội.</p>
          </Card>
        ) : results.length > 0 ? (
          <Card className="rounded-2xl border-slate-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                Radar Video (Danh sách Chi tiết)
              </h3>
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-50">{results.length} kết quả</Badge>
                <Button variant="outline" size="sm" className="rounded-lg" onClick={exportCsv}>
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Xuất CSV
                </Button>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead className="w-[180px]">Media</TableHead>
                  <TableHead className="w-[560px]">Chi tiết video & kênh</TableHead>
                  <TableHead>View</TableHead>
                  <TableHead>Sub</TableHead>
                  <TableHead>V/S</TableHead>
                  <TableHead>Est. $</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((item) => (
                  <TableRow key={item.id} className={`${item.scores.goldMine >= 70 ? 'bg-amber-50/40' : ''} hover:bg-slate-50/60`}>
                    <TableCell>
                      <div className="w-[132px] relative">
                        <Image
                          src={item.thumbnail}
                          alt={item.title}
                          width={132}
                          height={74}
                          className="w-[132px] h-[74px] object-cover rounded-xl border border-slate-100"
                        />
                        <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/80 text-white text-[11px] px-1.5 py-0.5 font-semibold">
                          {getVideoDurationLabel(item.duration)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <a
                          href={`https://www.youtube.com/watch?v=${item.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-slate-800 text-xl leading-tight line-clamp-2 hover:text-blue-600 transition-colors"
                        >
                          {item.title}
                        </a>
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <a
                            href={`https://www.youtube.com/channel/${item.channelId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-slate-800 hover:text-blue-600 transition-colors"
                          >
                            {item.channelTitle}
                          </a>
                          <Badge className="bg-slate-100 text-slate-700 border border-slate-200">Sub: {formatNumber(item.channel.subscriberCount)}</Badge>
                          {isNewChannel(item.channel.createdAt) ? <Badge className="bg-blue-50 text-blue-700 border border-blue-200">Kênh mới</Badge> : null}
                        </div>
                        <div className="flex flex-wrap gap-2 text-sm text-slate-600 pt-1">
                          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1">{formatDateTimeVN(item.publishedAt)}</span>
                          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1"><CalendarClock className="w-3.5 h-3.5 text-slate-400" />Tạo: {item.channel.createdAt ? formatDateVN(item.channel.createdAt) : 'N/A'}</span>
                          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1"><Film className="w-3.5 h-3.5 text-slate-400" />Tổng video: {formatNumber(item.channel.videoCount)}</span>
                        </div>
                        <div className="text-sm text-slate-500">Cập nhật: {formatTime(item.publishedAt)}</div>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {item.badges.includes('Gold Mine') ? (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                              <Gem className="w-3 h-3" />
                              Mỏ Vàng
                            </span>
                          ) : null}
                          {item.badges
                            .filter((badge) => badge !== 'Gold Mine')
                            .map((badge) => (
                              <span key={badge} className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${badgeClass[badge] || 'bg-slate-100 text-slate-600'}`}>
                                {badgeLabel[badge] || badge}
                              </span>
                            ))}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-lg font-black text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 inline-block">
                        {formatNumber(item.viewCount)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-lg font-black text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 inline-block">
                        {formatNumber(item.channel.subscriberCount)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-xl font-black text-emerald-600">{item.scores.viewSubRatio.toFixed(2)}x</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-xl font-black text-emerald-600">${estimateUsd(item.viewCount, item.channel.country, market).toFixed(2)}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <a href={`https://www.youtube.com/watch?v=${item.id}`} target="_blank" rel="noreferrer" className="inline-flex">
                        <Button variant="outline" size="icon" className="rounded-lg">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <Card className="rounded-2xl p-12 text-center text-slate-500 border-slate-100">
            Không có video phù hợp. Thử đổi keyword hoặc nới điều kiện lọc.
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
