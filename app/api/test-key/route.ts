import { NextRequest, NextResponse } from 'next/server';

type Service = 'youtube' | 'gemini' | 'openai' | 'openrouter';

const testYoutube = async (key: string) => {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=youtube&key=${encodeURIComponent(key)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'YouTube key không hợp lệ.');
  }
};

const testGemini = async (key: string) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'ping' }] }],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Gemini key không hợp lệ.');
  }
};

const testOpenAi = async (key: string) => {
  const res = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'OpenAI key không hợp lệ.');
  }
};

const testOpenRouter = async (key: string) => {
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'OpenRouter key không hợp lệ.');
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { service?: Service; key?: string };
    const service = body.service;
    const key = body.key?.trim();

    if (!service || !key) {
      return NextResponse.json({ ok: false, message: 'Thiếu service hoặc key.' }, { status: 400 });
    }

    if (service === 'youtube') await testYoutube(key);
    if (service === 'gemini') await testGemini(key);
    if (service === 'openai') await testOpenAi(key);
    if (service === 'openrouter') await testOpenRouter(key);

    return NextResponse.json({ ok: true, message: 'Kết nối API thành công.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không thể test API key.';
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
