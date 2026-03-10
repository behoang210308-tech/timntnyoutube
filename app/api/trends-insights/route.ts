import { NextRequest, NextResponse } from 'next/server';

interface TrendsBody {
  keyword?: string;
  market?: string;
}

interface TrendsInsights {
  trendScore: number;
  momentum: number;
  relatedKeywords: string[];
  expandedKeywords: string[];
}

interface CachedTrendsEntry {
  data: TrendsInsights;
  expiresAt: number;
}

const MARKET_TO_GEO: Record<string, string> = {
  GLOBAL: '',
  US: 'US',
  AU: 'AU',
  CA: 'CA',
  GB: 'GB',
  DE: 'DE',
  JP: 'JP',
  KR: 'KR',
  SG: 'SG',
  VN: 'VN',
  ID: 'ID',
  IN: 'IN',
  BR: 'BR',
  HK: 'HK',
  NL: 'NL',
  NZ: 'NZ',
};

const TRENDS_CACHE = new Map<string, CachedTrendsEntry>();
const TRENDS_CACHE_TTL_MS = 20 * 60 * 1000;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const normalizeText = (value: string) => value.toLowerCase().trim();

const buildCacheKey = (keyword: string, geo: string) => `${normalizeText(keyword)}::${geo || 'GLOBAL'}`;

const getCachedTrends = (cacheKey: string) => {
  const cached = TRENDS_CACHE.get(cacheKey);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    TRENDS_CACHE.delete(cacheKey);
    return null;
  }
  return cached.data;
};

const setCachedTrends = (cacheKey: string, data: TrendsInsights) => {
  TRENDS_CACHE.set(cacheKey, {
    data,
    expiresAt: Date.now() + TRENDS_CACHE_TTL_MS,
  });
};

const parseGoogleJson = async <T,>(response: Response): Promise<T> => {
  const raw = await response.text();
  const cleaned = raw.replace(/^\)\]\}',?/, '').trim();
  return JSON.parse(cleaned) as T;
};

const getExploreData = async (keyword: string, geo: string) => {
  const requestPayload = {
    comparisonItem: [{ keyword, geo, time: 'today 12-m' }],
    category: 0,
    property: 'youtube',
  };
  const params = new URLSearchParams({
    hl: 'en-US',
    tz: '0',
    req: JSON.stringify(requestPayload),
  });
  const url = `https://trends.google.com/trends/api/explore?${params.toString()}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Accept: 'application/json',
    },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Không lấy được dữ liệu explore từ Google Trends.');
  return parseGoogleJson<{ widgets?: Array<Record<string, unknown>> }>(response);
};

const getTimelineTrend = async (timeseriesWidget: Record<string, unknown>) => {
  const request = encodeURIComponent(JSON.stringify(timeseriesWidget.request || {}));
  const token = encodeURIComponent(String(timeseriesWidget.token || ''));
  const url = `https://trends.google.com/trends/api/widgetdata/multiline?hl=en-US&tz=0&req=${request}&token=${token}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!response.ok) return { trendScore: 0, momentum: 0 };

  const data = await parseGoogleJson<{ default?: { timelineData?: Array<{ value?: number[] }> } }>(response);
  const values = (data.default?.timelineData || [])
    .map((item) => item.value?.[0] || 0)
    .filter((item) => Number.isFinite(item));
  if (values.length === 0) return { trendScore: 0, momentum: 0 };

  const recent = values[values.length - 1];
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const momentum = avg > 0 ? ((recent - avg) / avg) * 100 : 0;
  const normalizedMomentum = clamp(50 + momentum / 2, 0, 100);
  const trendScore = Math.round(recent * 0.7 + normalizedMomentum * 0.3);

  return {
    trendScore: clamp(trendScore, 0, 100),
    momentum: Math.round(momentum),
  };
};

const getRelatedKeywords = async (relatedWidgets: Array<Record<string, unknown>>) => {
  const keywordSet = new Set<string>();

  for (const widget of relatedWidgets.slice(0, 2)) {
    const request = encodeURIComponent(JSON.stringify(widget.request || {}));
    const token = encodeURIComponent(String(widget.token || ''));
    const url = `https://trends.google.com/trends/api/widgetdata/relatedsearches?hl=en-US&tz=0&req=${request}&token=${token}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) continue;

    const data = await parseGoogleJson<{
      default?: { rankedList?: Array<{ rankedKeyword?: Array<{ query?: string }> }> };
    }>(response);

    (data.default?.rankedList || []).forEach((list) => {
      (list.rankedKeyword || []).forEach((item) => {
        const query = item.query?.trim();
        if (query) keywordSet.add(query);
      });
    });
  }

  return Array.from(keywordSet).slice(0, 16);
};

const getAutocompleteKeywords = async (keyword: string) => {
  const url = `https://trends.google.com/trends/api/autocomplete/${encodeURIComponent(keyword)}?hl=en-US`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!response.ok) return [];

  const data = await parseGoogleJson<{ default?: { topics?: Array<{ title?: string }> } }>(response);
  return (data.default?.topics || []).map((item) => item.title?.trim() || '').filter(Boolean).slice(0, 8);
};

const parseTraffic = (value: string) => {
  const normalized = value.replace(/,/g, '').trim().toUpperCase();
  const number = parseFloat(normalized.replace(/[^\d.]/g, '')) || 0;
  if (normalized.includes('M')) return number * 1_000_000;
  if (normalized.includes('K')) return number * 1_000;
  return number;
};

const decodeXmlEntities = (value: string) =>
  value
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

const filterKeywordsByContext = (seedKeyword: string, candidates: string[]) => {
  const seedTokens = normalizeText(seedKeyword)
    .split(/\s+/)
    .filter((token) => token.length > 2);
  if (seedTokens.length === 0) return candidates.slice(0, 16);

  const scored = candidates
    .map((candidate) => {
      const normalized = normalizeText(candidate);
      const overlap = seedTokens.filter((token) => normalized.includes(token)).length;
      const score = overlap * 3 + (normalized.includes('youtube') ? 1 : 0);
      return { candidate, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.candidate);

  if (scored.length >= 4) return Array.from(new Set(scored)).slice(0, 16);
  if (scored.length === 1) return Array.from(new Set(scored)).slice(0, 16);
  if (scored.length > 0) {
    const fallbackShortlist = candidates.filter((item) => !scored.includes(item)).slice(0, 2);
    return Array.from(new Set([...scored, ...fallbackShortlist])).slice(0, 16);
  }
  return [];
};

const getDailyRssFallback = async (keyword: string, geo: string): Promise<TrendsInsights> => {
  const fallbackGeo = geo || 'US';
  const response = await fetch(`https://trends.google.com/trending/rss?geo=${encodeURIComponent(fallbackGeo)}`, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/rss+xml, application/xml' },
    cache: 'no-store',
  });
  if (!response.ok) {
    return { trendScore: 0, momentum: 0, relatedKeywords: [], expandedKeywords: [keyword] };
  }

  const xml = await response.text();
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  const titleRegex = /<title>([\s\S]*?)<\/title>/;
  const trafficRegex = /<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/;

  const entries: Array<{ title: string; traffic: number }> = [];
  let match: RegExpExecArray | null = itemRegex.exec(xml);
  while (match) {
    const item = match[1];
    const title = decodeXmlEntities(item.match(titleRegex)?.[1]?.trim() || '');
    const trafficRaw = item.match(trafficRegex)?.[1]?.trim() || '0';
    if (title) {
      entries.push({ title, traffic: parseTraffic(trafficRaw) });
    }
    match = itemRegex.exec(xml);
  }

  const keywordTokens = keyword.toLowerCase().split(/\s+/).filter((token) => token.length > 2);
  const topEntries = entries.slice(0, 20);
  const relatedKeywordsRaw = topEntries.map((item) => item.title).slice(0, 12);
  const relatedKeywords = filterKeywordsByContext(keyword, relatedKeywordsRaw);

  const matchedTraffic = topEntries
    .filter((entry) => keywordTokens.some((token) => entry.title.toLowerCase().includes(token)))
    .reduce((sum, entry) => sum + entry.traffic, 0);
  const maxTraffic = topEntries.reduce((sum, entry) => Math.max(sum, entry.traffic), 1);
  const trendScore = clamp(Math.round((matchedTraffic / maxTraffic) * 100), 0, 100);
  const momentum = clamp(Math.round(trendScore - 35), -50, 100);

  return {
    trendScore,
    momentum,
    relatedKeywords,
    expandedKeywords: filterKeywordsByContext(keyword, Array.from(new Set([keyword, ...relatedKeywordsRaw]))).slice(0, 12),
  };
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TrendsBody;
    const keyword = body.keyword?.trim();
    if (!keyword) {
      return NextResponse.json({ ok: false, message: 'Thiếu keyword.' }, { status: 400 });
    }

    const geo = MARKET_TO_GEO[body.market || 'US'] ?? 'US';
    const cacheKey = buildCacheKey(keyword, geo);
    const cached = getCachedTrends(cacheKey);
    if (cached) {
      return NextResponse.json({ ok: true, data: cached, cached: true });
    }

    try {
      const explore = await getExploreData(keyword, geo);
      const widgets = explore.widgets || [];

      const timeseriesWidget = widgets.find((widget) => widget.id === 'TIMESERIES');
      const relatedWidgets = widgets.filter((widget) => widget.id === 'RELATED_QUERIES');

      const trendCore = timeseriesWidget ? await getTimelineTrend(timeseriesWidget) : { trendScore: 0, momentum: 0 };
      const relatedKeywordsRaw = await getRelatedKeywords(relatedWidgets);
      const autocompleteKeywords = await getAutocompleteKeywords(keyword);
      const relatedKeywords = filterKeywordsByContext(keyword, relatedKeywordsRaw);
      const expandedKeywords = filterKeywordsByContext(
        keyword,
        Array.from(new Set([keyword, ...relatedKeywords, ...autocompleteKeywords]))
      ).slice(0, 12);

      const payload: TrendsInsights = {
        trendScore: trendCore.trendScore,
        momentum: trendCore.momentum,
        relatedKeywords,
        expandedKeywords,
      };

      setCachedTrends(cacheKey, payload);
      return NextResponse.json({ ok: true, data: payload });
    } catch {
      const fallback = await getDailyRssFallback(keyword, geo);
      setCachedTrends(cacheKey, fallback);
      return NextResponse.json({ ok: true, data: fallback });
    }
  } catch {
    return NextResponse.json({
      ok: true,
      data: {
        trendScore: 0,
        momentum: 0,
        relatedKeywords: [],
        expandedKeywords: [],
      } satisfies TrendsInsights,
    });
  }
}
