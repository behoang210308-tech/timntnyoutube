import { ChannelBase, ChannelInputNormalized, ChannelVideo, SimilarChannel } from '@/lib/server/channel-analysis/types';

const BASE_URL = 'https://www.googleapis.com/youtube/v3';

const toNumber = (value?: string) => Number.parseInt(value || '0', 10) || 0;

const parseDurationSeconds = (isoDuration?: string) => {
  if (!isoDuration) return 0;
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  return hours * 3600 + minutes * 60 + seconds;
};

const toDurationLabel = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const ytFetch = async <T,>(apiKey: string, endpoint: string, params: Record<string, string | number>) => {
  const search = new URLSearchParams({ ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])), key: apiKey });
  const response = await fetch(`${BASE_URL}/${endpoint}?${search.toString()}`, { cache: 'no-store' });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `YouTube API lỗi ở endpoint ${endpoint}.`);
  }
  return (await response.json()) as T;
};

const resolveChannelId = async (apiKey: string, normalized: ChannelInputNormalized) => {
  if (normalized.channelId) return normalized.channelId;
  const data = await ytFetch<{ items?: Array<{ id?: { channelId?: string } }> }>(apiKey, 'search', {
    part: 'snippet',
    q: normalized.query,
    type: 'channel',
    maxResults: 1,
  });
  const channelId = data.items?.[0]?.id?.channelId;
  if (!channelId) throw new Error('Không tìm thấy kênh từ dữ liệu bạn nhập.');
  return channelId;
};

export const fetchChannelBase = async (apiKey: string, normalized: ChannelInputNormalized): Promise<ChannelBase> => {
  const channelId = await resolveChannelId(apiKey, normalized);
  const channelData = await ytFetch<{
    items?: Array<{
      id: string;
      snippet?: {
        title?: string;
        description?: string;
        customUrl?: string;
        publishedAt?: string;
        country?: string;
        thumbnails?: {
          high?: { url?: string };
          default?: { url?: string };
        };
      };
      statistics?: {
        subscriberCount?: string;
        viewCount?: string;
        videoCount?: string;
      };
    }>;
  }>(apiKey, 'channels', {
    part: 'snippet,statistics',
    id: channelId,
  });

  const channel = channelData.items?.[0];
  if (!channel) throw new Error('Không tải được dữ liệu kênh.');
  const title = channel.snippet?.title || channelId;
  const customUrl = channel.snippet?.customUrl || '';
  const handle = customUrl ? `@${customUrl.replace(/^@/, '')}` : normalized.handle || 'Unknown';

  return {
    channelId,
    title,
    description: channel.snippet?.description || '',
    avatarUrl: channel.snippet?.thumbnails?.high?.url || channel.snippet?.thumbnails?.default?.url || '',
    handle,
    channelUrl: `https://www.youtube.com/channel/${channelId}`,
    createdAt: channel.snippet?.publishedAt || '',
    country: channel.snippet?.country || 'Unknown',
    subscriberCount: toNumber(channel.statistics?.subscriberCount),
    totalViews: toNumber(channel.statistics?.viewCount),
    totalVideos: toNumber(channel.statistics?.videoCount),
  };
};

const fetchVideoDetails = async (apiKey: string, ids: string[]) => {
  if (ids.length === 0) return [] as ChannelVideo[];
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 50) {
    chunks.push(ids.slice(i, i + 50));
  }
  const all: ChannelVideo[] = [];
  for (const chunk of chunks) {
    const detail = await ytFetch<{
      items?: Array<{
        id: string;
        snippet?: {
          title?: string;
          description?: string;
          publishedAt?: string;
          tags?: string[];
          categoryId?: string;
          thumbnails?: {
            high?: { url?: string; width?: number; height?: number };
            medium?: { url?: string; width?: number; height?: number };
            default?: { url?: string; width?: number; height?: number };
          };
        };
        contentDetails?: { duration?: string };
        statistics?: {
          viewCount?: string;
          likeCount?: string;
          commentCount?: string;
        };
      }>;
    }>(apiKey, 'videos', {
      part: 'snippet,contentDetails,statistics',
      id: chunk.join(','),
      maxResults: 50,
    });

    all.push(
      ...(detail.items || []).map((item) => {
        const durationSeconds = parseDurationSeconds(item.contentDetails?.duration);
        const mediumThumb = item.snippet?.thumbnails?.medium;
        const highThumb = item.snippet?.thumbnails?.high;
        const defaultThumb = item.snippet?.thumbnails?.default;
        const thumb = highThumb || mediumThumb || defaultThumb;
        return {
          id: item.id,
          title: item.snippet?.title || '',
          description: item.snippet?.description || '',
          publishedAt: item.snippet?.publishedAt || '',
          duration: toDurationLabel(durationSeconds),
          durationSeconds,
          categoryId: item.snippet?.categoryId || '',
          tags: item.snippet?.tags || [],
          viewCount: toNumber(item.statistics?.viewCount),
          likeCount: toNumber(item.statistics?.likeCount),
          commentCount: toNumber(item.statistics?.commentCount),
          thumbnailUrl: thumb?.url || '',
          thumbnailWidth: thumb?.width || 0,
          thumbnailHeight: thumb?.height || 0,
        };
      })
    );
  }
  return all;
};

export const fetchChannelVideos = async (apiKey: string, channelId: string) => {
  const latest = await ytFetch<{
    items?: Array<{ id?: { videoId?: string } }>;
  }>(apiKey, 'search', {
    part: 'snippet',
    channelId,
    type: 'video',
    order: 'date',
    maxResults: 50,
  });

  const byViews = await ytFetch<{
    items?: Array<{ id?: { videoId?: string } }>;
  }>(apiKey, 'search', {
    part: 'snippet',
    channelId,
    type: 'video',
    order: 'viewCount',
    maxResults: 50,
  });

  const ids = Array.from(
    new Set([
      ...(latest.items || []).map((item) => item.id?.videoId || '').filter(Boolean),
      ...(byViews.items || []).map((item) => item.id?.videoId || '').filter(Boolean),
    ])
  );

  const videos = await fetchVideoDetails(apiKey, ids);
  const latestVideoIds = new Set((latest.items || []).map((item) => item.id?.videoId || ''));
  const topVideoIds = new Set((byViews.items || []).map((item) => item.id?.videoId || ''));

  return {
    videos,
    latestVideos: videos.filter((video) => latestVideoIds.has(video.id)),
    topVideos: videos.filter((video) => topVideoIds.has(video.id)).sort((a, b) => b.viewCount - a.viewCount),
  };
};

export const fetchSimilarChannels = async (apiKey: string, query: string, excludeChannelId: string, topics: string[]) => {
  const search = await ytFetch<{
    items?: Array<{ id?: { channelId?: string } }>;
  }>(apiKey, 'search', {
    part: 'snippet',
    q: query,
    type: 'channel',
    maxResults: 20,
  });

  const ids = Array.from(
    new Set(
      (search.items || [])
        .map((item) => item.id?.channelId || '')
        .filter((id) => id && id !== excludeChannelId)
    )
  );
  if (ids.length === 0) return [] as SimilarChannel[];

  const channels = await ytFetch<{
    items?: Array<{
      id: string;
      snippet?: { title?: string; description?: string };
      statistics?: { subscriberCount?: string; videoCount?: string; viewCount?: string };
    }>;
  }>(apiKey, 'channels', {
    part: 'snippet,statistics',
    id: ids.join(','),
  });

  return (channels.items || []).map((item) => {
    const title = item.snippet?.title || item.id;
    const titleLower = title.toLowerCase();
    const matchedTopics = topics.filter((topic) => titleLower.includes(topic.toLowerCase())).slice(0, 4);
    return {
      channelId: item.id,
      title,
      description: item.snippet?.description || '',
      subscriberCount: toNumber(item.statistics?.subscriberCount),
      totalViews: toNumber(item.statistics?.viewCount),
      totalVideos: toNumber(item.statistics?.videoCount),
      matchedTopics,
    };
  });
};
