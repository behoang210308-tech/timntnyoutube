import { ChannelInputNormalized } from '@/lib/server/channel-analysis/types';

const CHANNEL_ID_PATTERN = /^UC[\w-]{20,}$/i;

export const normalizeChannelInput = (input: string): ChannelInputNormalized => {
  const raw = input.trim();
  if (!raw) {
    throw new Error('Thiếu dữ liệu kênh. Hãy nhập channel URL, @handle hoặc channel ID.');
  }

  if (CHANNEL_ID_PATTERN.test(raw)) {
    return {
      raw,
      query: raw,
      channelId: raw,
      mode: 'channelId',
    };
  }

  const channelIdFromUrl = raw.match(/youtube\.com\/channel\/(UC[\w-]{20,})/i)?.[1];
  if (channelIdFromUrl) {
    return {
      raw,
      query: channelIdFromUrl,
      channelId: channelIdFromUrl,
      mode: 'channelId',
    };
  }

  const handleFromUrl = raw.match(/youtube\.com\/@([A-Za-z0-9._-]+)/i)?.[1];
  const handleDirect = raw.match(/^@([A-Za-z0-9._-]+)$/)?.[1];
  const handle = handleFromUrl || handleDirect;
  if (handle) {
    return {
      raw,
      query: handle,
      handle: `@${handle}`,
      mode: 'handle',
    };
  }

  const customPath = raw.match(/youtube\.com\/(c|user)\/([A-Za-z0-9._-]+)/i)?.[2];
  if (customPath) {
    return {
      raw,
      query: customPath,
      mode: 'query',
    };
  }

  return {
    raw,
    query: raw,
    mode: 'query',
  };
};
