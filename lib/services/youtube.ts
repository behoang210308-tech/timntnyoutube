
import axios from 'axios';

export interface YoutubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  channelId: string;
  channelTitle: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  duration: string;
}

export interface YoutubeChannel {
  id: string;
  title: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number; // Total channel views
  country?: string;
  createdAt?: string;
}

export interface NicheResult extends YoutubeVideo {
  channel: YoutubeChannel;
  badges: ('Gold Mine' | 'Saturated' | 'Rising Star')[];
  scores: {
    goldMine: number; // 0-100
    viewSubRatio: number;
  };
}

export interface SearchFilters {
  q: string;
  publishedAfter?: string;
  regionCode?: string;
  videoDuration?: 'any' | 'long' | 'medium' | 'short';
  type?: 'video' | 'channel' | 'playlist';
  maxResults?: number;
}

const BASE_URL = 'https://www.googleapis.com/youtube/v3';

interface YoutubeSearchItem {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    publishedAt: string;
    channelId: string;
    channelTitle: string;
    thumbnails: {
      high?: { url: string };
      default?: { url: string };
    };
  };
}

interface YoutubeSearchResponse {
  items?: YoutubeSearchItem[];
  nextPageToken?: string;
}

interface YoutubeVideoItem {
  id: string;
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
  contentDetails?: {
    duration?: string;
  };
}

interface YoutubeChannelItem {
  id: string;
  snippet?: {
    title?: string;
    country?: string;
    publishedAt?: string;
  };
  statistics?: {
    subscriberCount?: string;
    videoCount?: string;
    viewCount?: string;
  };
}

export const searchYoutube = async (
  apiKey: string,
  filters: SearchFilters
): Promise<NicheResult[]> => {
  try {
    const requestedMax = Math.min(Math.max(filters.maxResults || 50, 10), 150);
    const buildParams = (order: 'relevance' | 'date', pageToken?: string) => {
      const params: Record<string, string | number> = {
        part: 'snippet',
        q: filters.q,
        maxResults: 50,
        key: apiKey,
        type: 'video',
        order,
      };

      if (pageToken) params.pageToken = pageToken;
      if (filters.publishedAfter) params.publishedAfter = filters.publishedAfter;
      if (filters.regionCode && filters.regionCode !== 'GLOBAL') params.regionCode = filters.regionCode;
      if (filters.videoDuration && filters.videoDuration !== 'any') params.videoDuration = filters.videoDuration;

      return params;
    };

    const mergedMap = new Map<string, YoutubeSearchItem>();
    const orders: Array<'relevance' | 'date'> = ['relevance', 'date'];

    for (const order of orders) {
      let nextPageToken: string | undefined = undefined;
      let loop = 0;

      while (mergedMap.size < requestedMax && loop < 3) {
        const response = await axios.get<YoutubeSearchResponse>(`${BASE_URL}/search`, {
          params: buildParams(order, nextPageToken),
        });
        const batch = response.data.items ?? [];
        batch.forEach((item) => {
          if (!mergedMap.has(item.id.videoId)) {
            mergedMap.set(item.id.videoId, item);
          }
        });
        nextPageToken = response.data.nextPageToken;
        loop += 1;
        if (!nextPageToken) break;
      }
      if (mergedMap.size >= requestedMax) break;
    }

    const items = Array.from(mergedMap.values()).slice(0, requestedMax);

    if (items.length === 0) return [];

    const videoIds = items.map((item) => item.id.videoId).join(',');
    const channelIds = [...new Set(items.map((item) => item.snippet.channelId))].join(',');

    const videosRes = await axios.get<{ items?: YoutubeVideoItem[] }>(`${BASE_URL}/videos`, {
      params: {
        part: 'statistics,contentDetails,snippet',
        id: videoIds,
        key: apiKey,
      },
    });

    const channelsRes = await axios.get<{ items?: YoutubeChannelItem[] }>(`${BASE_URL}/channels`, {
      params: {
        part: 'statistics,snippet',
        id: channelIds,
        key: apiKey,
      },
    });

    const videosMap = new Map((videosRes.data.items ?? []).map((video) => [video.id, video]));
    const channelsMap = new Map((channelsRes.data.items ?? []).map((channel) => [channel.id, channel]));

    const results: NicheResult[] = items.map((item) => {
      const videoId = item.id.videoId;
      const channelId = item.snippet.channelId;
      
      const videoDetail = videosMap.get(videoId);
      const channelDetail = channelsMap.get(channelId);

      const viewCount = parseInt(videoDetail?.statistics?.viewCount || '0');
      const likeCount = parseInt(videoDetail?.statistics?.likeCount || '0');
      const commentCount = parseInt(videoDetail?.statistics?.commentCount || '0');
      
      const subscriberCount = parseInt(channelDetail?.statistics?.subscriberCount || '0');
      const channelVideoCount = parseInt(channelDetail?.statistics?.videoCount || '0');

      const viewSubRatio = subscriberCount > 0 ? (viewCount / subscriberCount) : 0;
      
      let goldMineScore = 0;
      const badges: NicheResult['badges'] = [];
      
      if (viewCount > 10000) goldMineScore += 20;
      if (viewCount > 100000) goldMineScore += 20;
      if (viewCount > 500000) goldMineScore += 10;
      
      if (viewSubRatio > 1) goldMineScore += 10;
      if (viewSubRatio > 3) goldMineScore += 20;
      if (viewSubRatio > 10) goldMineScore += 20;

      if (subscriberCount < 10000) goldMineScore += 10;
      if (subscriberCount < 5000 && viewCount > 50000) goldMineScore += 10;
      if (channelVideoCount > 0 && channelVideoCount < 60) goldMineScore += 5;

      goldMineScore = Math.min(100, goldMineScore);

      if (goldMineScore >= 70) badges.push('Gold Mine');
      if (subscriberCount > 1000000 && viewSubRatio < 0.1) badges.push('Saturated');

      return {
        id: videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
        publishedAt: item.snippet.publishedAt,
        channelId: channelId,
        channelTitle: item.snippet.channelTitle,
        viewCount,
        likeCount,
        commentCount,
        duration: videoDetail?.contentDetails?.duration || '',
        channel: {
          id: channelId,
          title: channelDetail?.snippet?.title || '',
          subscriberCount,
          videoCount: channelVideoCount,
          viewCount: parseInt(channelDetail?.statistics?.viewCount || '0'),
          country: channelDetail?.snippet?.country,
          createdAt: channelDetail?.snippet?.publishedAt,
        },
        badges,
        scores: {
          goldMine: goldMineScore,
          viewSubRatio,
        },
      };
    });

    return results.sort((a, b) => b.scores.goldMine - a.scores.goldMine);

  } catch (error) {
    console.error('Error fetching Youtube data:', error);
    throw error;
  }
};
