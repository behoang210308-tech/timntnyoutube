import { NextRequest, NextResponse } from 'next/server';
import { analyzeChannelDeep } from '@/lib/server/channel-analysis/analyzer';
import { resolveYoutubeApiKeyWithSource } from '@/lib/server/youtube-key';
import { AnalyzedChannelPayload } from '@/lib/server/channel-analysis/types';

interface ChannelAnalyzeBody {
  channelInput?: string;
  compareInput?: string;
  clientApiKey?: string;
}

interface CachedEntry {
  data: { main: AnalyzedChannelPayload; compare: AnalyzedChannelPayload | null };
  expiresAt: number;
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const CACHE_TTL_MS = 8 * 60 * 1000;
const REQUEST_LIMIT = 12;
const WINDOW_MS = 60 * 1000;
const ANALYZE_CACHE = new Map<string, CachedEntry>();
const RATE_LIMIT = new Map<string, RateLimitEntry>();

const normalizeKey = (value: string) => value.trim().toLowerCase();

const buildCacheKey = (channelInput: string, compareInput?: string) =>
  `${normalizeKey(channelInput)}::${normalizeKey(compareInput || '')}`;

const checkRateLimit = (request: NextRequest) => {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const now = Date.now();
  const found = RATE_LIMIT.get(ip);
  if (!found || now - found.windowStart > WINDOW_MS) {
    RATE_LIMIT.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (found.count >= REQUEST_LIMIT) {
    return false;
  }
  found.count += 1;
  RATE_LIMIT.set(ip, found);
  return true;
};

export async function POST(request: NextRequest) {
  try {
    if (!checkRateLimit(request)) {
      return NextResponse.json({ ok: false, message: 'Bạn đang thao tác quá nhanh. Vui lòng thử lại sau 1 phút.' }, { status: 429 });
    }

    const body = (await request.json()) as ChannelAnalyzeBody;
    const channelInput = body.channelInput?.trim();
    if (!channelInput) {
      return NextResponse.json({ ok: false, message: 'Thiếu channelInput.' }, { status: 400 });
    }

    const keyResolved = resolveYoutubeApiKeyWithSource(body.clientApiKey);
    if (!keyResolved.key) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: 'MISSING_YOUTUBE_API_KEY',
          message: 'Thiếu YouTube API key. Hãy cấu hình YOUTUBE_API_KEY ở server hoặc thêm key ở client.',
          hint: 'Bạn có thể vào API Keys để thêm key YouTube rồi phân tích lại.',
        },
        { status: 400 }
      );
    }

    const compareInput = body.compareInput?.trim();
    const cacheKey = buildCacheKey(channelInput, compareInput);
    const cached = ANALYZE_CACHE.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return NextResponse.json({ ok: true, data: cached.data, cached: true });
    }

    const result = await analyzeChannelDeep(keyResolved.key, channelInput, compareInput);
    ANALYZE_CACHE.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return NextResponse.json({ ok: true, data: result, cached: false, keySource: keyResolved.source });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không thể phân tích kênh.';
    return NextResponse.json({ ok: false, errorCode: 'CHANNEL_ANALYZE_FAILED', message }, { status: 500 });
  }
}
