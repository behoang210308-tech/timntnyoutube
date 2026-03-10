import { NextRequest, NextResponse } from 'next/server';

interface TranslateBody {
  text?: string;
  targetLang?: string;
}

const LANGUAGE_MAP: Record<string, string> = {
  EN: 'en',
  JP: 'ja',
  JA: 'ja',
  KR: 'ko',
  KO: 'ko',
  DE: 'de',
  VN: 'vi',
  VI: 'vi',
  ES: 'es',
  FR: 'fr',
  PT: 'pt',
};

const extractTranslatedText = (payload: unknown) => {
  if (!Array.isArray(payload) || !Array.isArray(payload[0])) return '';
  const chunks = payload[0]
    .map((item) => (Array.isArray(item) && typeof item[0] === 'string' ? item[0] : ''))
    .filter(Boolean);
  return chunks.join('').trim();
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TranslateBody;
    const text = body.text?.trim();
    const targetLang = LANGUAGE_MAP[(body.targetLang || '').toUpperCase()] || 'en';
    if (!text) {
      return NextResponse.json({ ok: false, message: 'Thiếu text cần dịch.' }, { status: 400 });
    }

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) {
      return NextResponse.json({ ok: false, message: 'Dịch keyword thất bại.' }, { status: 502 });
    }

    const buffer = await response.arrayBuffer();
    const decoded = new TextDecoder('utf-8').decode(buffer);
    const raw = JSON.parse(decoded) as unknown;
    const translatedText = extractTranslatedText(raw);
    if (!translatedText) {
      return NextResponse.json({ ok: false, message: 'Không nhận được nội dung dịch.' }, { status: 502 });
    }

    return NextResponse.json({ ok: true, data: { translatedText } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi dịch keyword.';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
