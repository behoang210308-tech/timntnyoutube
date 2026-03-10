import axios from 'axios';
import { formatNumber } from '@/lib/utils/format';

const BASE_URL = 'https://www.googleapis.com/youtube/v3';

interface ChannelSnippet {
  title?: string;
  description?: string;
  country?: string;
  customUrl?: string;
  publishedAt?: string;
  thumbnails?: {
    high?: { url?: string };
    default?: { url?: string };
  };
}

interface ChannelStatistics {
  subscriberCount?: string;
  videoCount?: string;
  viewCount?: string;
}

interface ChannelItem {
  id: string;
  snippet?: ChannelSnippet;
  statistics?: ChannelStatistics;
}

interface VideoSearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    publishedAt: string;
    channelId: string;
    thumbnails?: {
      high?: { url: string };
      default?: { url: string };
    };
  };
}

interface VideoDetailItem {
  id: string;
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
}

interface ChannelSearchItem {
  id?: { channelId?: string };
  snippet?: {
    channelId?: string;
    title?: string;
    description?: string;
    publishedAt?: string;
    thumbnails?: {
      high?: { url?: string };
      default?: { url?: string };
    };
  };
}

export interface ChannelVideoInsight {
  id: string;
  title: string;
  publishedAt: string;
  thumbnail: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

export interface ChannelAnalysisResult {
  channelId: string;
  title: string;
  description: string;
  country: string;
  subscriberCount: number;
  totalViews: number;
  totalVideos: number;
  topVideos: ChannelVideoInsight[];
  titlePatterns: string[];
  suggestedFormats: string[];
  quickSummary: string[];
  similarChannels: SimilarChannelInsight[];
}

export interface SimilarChannelInsight {
  channelId: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnail: string;
  subscriberCount: number;
  totalViews: number;
  totalVideos: number;
  matchedTopics: string[];
}

const toNumber = (value?: string) => parseInt(value || '0', 10);

const getTopTerms = (titles: string[]) => {
  const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'this', 'that', 'how', 'you', 'your']);
  const counts = new Map<string, number>();

  titles
    .flatMap((item) => item.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/))
    .filter((item) => item.length > 2 && !stopWords.has(item))
    .forEach((term) => {
      counts.set(term, (counts.get(term) || 0) + 1);
    });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([term]) => term);
};

const pickTopicKeywords = (mainTitle: string, description: string, titleTerms: string[]) => {
  const source = `${mainTitle} ${description}`.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const baseTerms = source
    .split(/\s+/)
    .filter((term) => term.length > 2)
    .slice(0, 10);
  const merged = [...titleTerms, ...baseTerms];
  return [...new Set(merged)].slice(0, 6);
};

const extractChannelIdFromInput = async (input: string, apiKey: string) => {
  const normalized = input.trim();

  if (!normalized) throw new Error('Channel input is empty.');
  if (/^UC[\w-]{20,}$/.test(normalized)) return normalized;

  const channelIdFromUrl = normalized.match(/youtube\.com\/channel\/(UC[\w-]{20,})/i)?.[1];
  if (channelIdFromUrl) return channelIdFromUrl;

  const handleMatch = normalized.match(/@([A-Za-z0-9._-]+)/);
  const query = handleMatch?.[1] || normalized;

  const response = await axios.get<{ items?: Array<{ id?: { channelId?: string } }> }>(`${BASE_URL}/search`, {
    params: {
      part: 'snippet',
      type: 'channel',
      q: query,
      maxResults: 1,
      key: apiKey,
    },
  });

  const channelId = response.data.items?.[0]?.id?.channelId;
  if (!channelId) throw new Error('Không tìm thấy channel từ dữ liệu bạn nhập.');
  return channelId;
};

export const analyzeChannel = async (apiKey: string, input: string): Promise<ChannelAnalysisResult> => {
  const channelId = await extractChannelIdFromInput(input, apiKey);

  const channelRes = await axios.get<{ items?: ChannelItem[] }>(`${BASE_URL}/channels`, {
    params: {
      part: 'snippet,statistics',
      id: channelId,
      key: apiKey,
    },
  });

  const channel = channelRes.data.items?.[0];
  if (!channel) throw new Error('Không tải được dữ liệu kênh.');

  const videosRes = await axios.get<{ items?: VideoSearchItem[] }>(`${BASE_URL}/search`, {
    params: {
      part: 'snippet',
      channelId,
      type: 'video',
      order: 'viewCount',
      maxResults: 12,
      key: apiKey,
    },
  });

  const videos = videosRes.data.items ?? [];
  const videoIds = videos.map((item) => item.id.videoId).join(',');

  const detailRes = videoIds
    ? await axios.get<{ items?: VideoDetailItem[] }>(`${BASE_URL}/videos`, {
        params: {
          part: 'statistics',
          id: videoIds,
          key: apiKey,
        },
      })
    : { data: { items: [] } };

  const detailMap = new Map((detailRes.data.items ?? []).map((item) => [item.id, item]));

  const topVideos: ChannelVideoInsight[] = videos.map((item) => {
    const detail = detailMap.get(item.id.videoId);
    return {
      id: item.id.videoId,
      title: item.snippet.title,
      publishedAt: item.snippet.publishedAt,
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || '',
      viewCount: toNumber(detail?.statistics?.viewCount),
      likeCount: toNumber(detail?.statistics?.likeCount),
      commentCount: toNumber(detail?.statistics?.commentCount),
    };
  });

  const averageTopViews =
    topVideos.length > 0 ? Math.round(topVideos.reduce((sum, item) => sum + item.viewCount, 0) / topVideos.length) : 0;
  const subscriberCount = toNumber(channel.statistics?.subscriberCount);
  const viewSubRatio = subscriberCount > 0 ? averageTopViews / subscriberCount : 0;

  const titleTerms = getTopTerms(topVideos.map((item) => item.title));
  const mainTitle = channel.snippet?.title || channelId;
  const mainDescription = channel.snippet?.description || '';
  const topicKeywords = pickTopicKeywords(mainTitle, mainDescription, titleTerms);

  const similarSearchRes = await axios.get<{ items?: ChannelSearchItem[] }>(`${BASE_URL}/search`, {
    params: {
      part: 'snippet',
      type: 'channel',
      q: topicKeywords.join(' '),
      maxResults: 20,
      key: apiKey,
    },
  });

  const similarSearchItems = similarSearchRes.data.items ?? [];
  const similarChannelIds = [...new Set(
    similarSearchItems
      .map((item) => item.id?.channelId || item.snippet?.channelId)
      .filter((item): item is string => Boolean(item && item !== channelId))
  )].slice(0, 20);

  const similarChannelsRes = similarChannelIds.length
    ? await axios.get<{ items?: ChannelItem[] }>(`${BASE_URL}/channels`, {
        params: {
          part: 'snippet,statistics',
          id: similarChannelIds.join(','),
          maxResults: 20,
          key: apiKey,
        },
      })
    : { data: { items: [] as ChannelItem[] } };

  const similarSnippetMap = new Map(
    similarSearchItems.map((item) => [item.id?.channelId || item.snippet?.channelId, item.snippet])
  );

  const similarChannels: SimilarChannelInsight[] = (similarChannelsRes.data.items ?? [])
    .map((item) => {
      const snippet = item.snippet;
      const searchSnippet = similarSnippetMap.get(item.id);
      const title = snippet?.title || searchSnippet?.title || item.id;
      const normalizedTitle = title.toLowerCase();
      const matchedTopics = topicKeywords.filter((term) => normalizedTitle.includes(term.toLowerCase())).slice(0, 3);
      return {
        channelId: item.id,
        title,
        description: snippet?.description || searchSnippet?.description || '',
        publishedAt: snippet?.publishedAt || searchSnippet?.publishedAt || '',
        thumbnail: snippet?.thumbnails?.high?.url || snippet?.thumbnails?.default?.url || searchSnippet?.thumbnails?.high?.url || searchSnippet?.thumbnails?.default?.url || '',
        subscriberCount: toNumber(item.statistics?.subscriberCount),
        totalViews: toNumber(item.statistics?.viewCount),
        totalVideos: toNumber(item.statistics?.videoCount),
        matchedTopics,
      };
    })
    .sort((a, b) => b.totalViews - a.totalViews);

  return {
    channelId,
    title: mainTitle,
    description: mainDescription,
    country: channel.snippet?.country || 'N/A',
    subscriberCount,
    totalViews: toNumber(channel.statistics?.viewCount),
    totalVideos: toNumber(channel.statistics?.videoCount),
    topVideos: topVideos.sort((a, b) => b.viewCount - a.viewCount),
    titlePatterns: titleTerms.map((term) => `Từ khóa lặp lại: ${term}`),
    suggestedFormats: [
      `Format listicle theo chủ đề ${titleTerms[0] || 'niche chính'}`,
      `Format so sánh kết quả trước/sau`,
      `Format case study ngắn kèm CTA rõ ràng`,
      `Format Q&A theo nỗi đau người mới`,
      `Format clip quick-win 3-5 phút`,
    ],
    quickSummary: [
      `Top video trung bình ~${formatNumber(averageTopViews)} views`,
      `Tỷ lệ top view/sub ~${viewSubRatio.toFixed(2)}x`,
      `Đã tìm thấy ${similarChannels.length} kênh cùng chủ đề/từ khóa`,
      subscriberCount < 100000 ? 'Kênh quy mô vừa/nhỏ, dễ học theo hơn' : 'Kênh quy mô lớn, cần chọn lọc phần dễ clone',
    ],
    similarChannels,
  };
};
