import { NextRequest, NextResponse } from 'next/server';
import { searchYoutube, SearchFilters } from '@/lib/services/youtube';
import { resolveYoutubeApiKey } from '@/lib/server/youtube-key';

interface YoutubeSearchBody {
  filters?: SearchFilters;
  clientApiKey?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as YoutubeSearchBody;
    if (!body.filters?.q?.trim()) {
      return NextResponse.json({ ok: false, message: 'Thiếu keyword để tìm kiếm.' }, { status: 400 });
    }

    const apiKey = resolveYoutubeApiKey(body.clientApiKey);
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, message: 'Thiếu YouTube API key. Hãy cấu hình YOUTUBE_API_KEY ở server hoặc thêm key ở client.' },
        { status: 400 }
      );
    }

    const data = await searchYoutube(apiKey, body.filters);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không thể tìm dữ liệu YouTube.';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
