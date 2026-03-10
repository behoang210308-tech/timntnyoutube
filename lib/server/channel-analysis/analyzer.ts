import { formatDateTimeVN } from '@/lib/utils/format';
import { normalizeChannelInput } from '@/lib/server/channel-analysis/normalize';
import { fetchChannelBase, fetchChannelVideos, fetchSimilarChannels } from '@/lib/server/channel-analysis/youtube-source';
import { AnalyzedChannelPayload, ChannelVideo, DataKind, LabeledValue } from '@/lib/server/channel-analysis/types';

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'this', 'that', 'how', 'you', 'your', 'khi', 'cho', 'cach', 'cách', 'nhung',
  'những', 'video', 'youtube', 'trong', 'voi', 'với', 'hay', 'mot', 'một', 'nhat', 'nhất', 'review', 'guide',
]);

const labeled = <T,>(value: T, kind: DataKind, note?: string): LabeledValue<T> => ({ value, kind, note });

const parseWords = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));

const topTerms = (texts: string[], limit = 10) => {
  const map = new Map<string, number>();
  texts.flatMap(parseWords).forEach((word) => {
    map.set(word, (map.get(word) || 0) + 1);
  });
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([word]) => word);
};

const toWeekdayVn = (date: string) =>
  new Intl.DateTimeFormat('vi-VN', { weekday: 'long', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(date));

const toHourVn = (date: string) =>
  Number(new Intl.DateTimeFormat('en-US', { hour: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(date)));

const countBy = <T,>(items: T[], resolver: (item: T) => string | number) => {
  const map = new Map<string, number>();
  items.forEach((item) => {
    const key = String(resolver(item));
    map.set(key, (map.get(key) || 0) + 1);
  });
  return map;
};

const average = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);

const classifyFormat = (video: ChannelVideo) => {
  if (video.durationSeconds <= 60) return 'Shorts';
  if (video.durationSeconds <= 300) return 'Quick Tutorial';
  if (video.durationSeconds <= 900) return 'Mid-form';
  return 'Long-form';
};

const classifyAudienceEstimated = (terms: string[]) => {
  const text = terms.join(' ');
  if (/game|gaming|roblox|minecraft/.test(text)) return 'Estimated: người xem trẻ, ưu tiên nội dung giải trí gaming';
  if (/ai|automation|tool|workflow|prompt/.test(text)) return 'Estimated: người làm content/kinh doanh quan tâm công cụ AI';
  if (/finance|money|crypto|invest|stock/.test(text)) return 'Estimated: người xem quan tâm tài chính và đầu tư';
  if (/study|learn|english|education|hoc|học/.test(text)) return 'Estimated: người xem học tập, cải thiện kỹ năng';
  return 'Estimated: nhóm người xem tổng quát trong ngách nội dung của kênh';
};

const scoreCompetition = (subscriberCount: number, avgViews: number, similarCount: number) => {
  const subScore = Math.min(100, subscriberCount / 20000);
  const viewScore = Math.min(100, avgViews / 5000);
  const densityScore = Math.min(100, similarCount * 6);
  return Math.round(subScore * 0.4 + viewScore * 0.35 + densityScore * 0.25);
};

const safeJsonKey = (input: string) => input.toLowerCase().replace(/[^\w]+/g, '-').slice(0, 60);

export const analyzeChannelDeep = async (apiKey: string, channelInput: string, compareInput?: string): Promise<{ main: AnalyzedChannelPayload; compare: AnalyzedChannelPayload | null }> => {
  const analyzedAt = new Date().toISOString();
  const analyzeOne = async (input: string): Promise<AnalyzedChannelPayload> => {
    const normalized = normalizeChannelInput(input);
    const base = await fetchChannelBase(apiKey, normalized);
    const { videos, latestVideos, topVideos } = await fetchChannelVideos(apiKey, base.channelId);

    if (videos.length === 0) {
      throw new Error('Kênh không có dữ liệu video công khai để phân tích.');
    }

    const terms = topTerms(videos.map((video) => `${video.title} ${video.description}`), 14);
    const themeTerms = terms.slice(0, 8);
    const themeQuery = themeTerms.slice(0, 5).join(' ');
    const similarChannels = await fetchSimilarChannels(apiKey, themeQuery || base.title, base.channelId, themeTerms);

    const clustersMap = new Map<string, { count: number; views: number }>();
    videos.forEach((video) => {
      const firstTag = parseWords(video.title)[0] || 'other';
      const bucket = clustersMap.get(firstTag) || { count: 0, views: 0 };
      bucket.count += 1;
      bucket.views += video.viewCount;
      clustersMap.set(firstTag, bucket);
    });

    const topicClusters = [...clustersMap.entries()]
      .map(([topic, value]) => ({
        topic,
        videoCount: value.count,
        avgViews: Math.round(value.views / value.count),
        kind: 'CALCULATED' as DataKind,
      }))
      .sort((a, b) => b.videoCount - a.videoCount)
      .slice(0, 8);

    const shorts = videos.filter((video) => video.durationSeconds <= 60);
    const longVideos = videos.filter((video) => video.durationSeconds > 60);
    const shortsRatio = videos.length > 0 ? shorts.length / videos.length : 0;
    const shortsAvgViews = average(shorts.map((video) => video.viewCount));
    const longAvgViews = average(longVideos.map((video) => video.viewCount));

    const formatMap = countBy(videos, classifyFormat);
    const contentFormats = [...formatMap.entries()].map(([format, count]) => {
      const group = videos.filter((video) => classifyFormat(video) === format);
      return {
        format,
        count,
        avgViews: Math.round(average(group.map((video) => video.viewCount))),
      };
    });

    const byViewSub = videos
      .map((video) => ({
        ...video,
        viewSubRatio: base.subscriberCount > 0 ? video.viewCount / base.subscriberCount : 0,
      }))
      .sort((a, b) => b.viewSubRatio - a.viewSubRatio)
      .slice(0, 12);

    const now = Date.now();
    const fastestRecentGrowthEstimated = latestVideos
      .map((video) => {
        const ageHours = Math.max(1, (now - new Date(video.publishedAt).getTime()) / (1000 * 60 * 60));
        return {
          ...video,
          estimatedGrowthScore: Number((video.viewCount / ageHours).toFixed(2)),
        };
      })
      .sort((a, b) => b.estimatedGrowthScore - a.estimatedGrowthScore)
      .slice(0, 12);

    const latestViewsTotal = latestVideos.reduce((sum, video) => sum + video.viewCount, 0) || 1;
    const growthContributionEstimated = latestVideos
      .map((video) => ({
        videoId: video.id,
        title: video.title,
        contributionRate: Number(((video.viewCount / latestViewsTotal) * 100).toFixed(2)),
      }))
      .sort((a, b) => b.contributionRate - a.contributionRate)
      .slice(0, 10);

    const weekdayMap = countBy(videos, (video) => toWeekdayVn(video.publishedAt));
    const hourMap = countBy(videos, (video) => toHourVn(video.publishedAt));
    const uploadsPerWeek = Number((videos.length / 12).toFixed(2));
    const consistencyScore = Math.max(0, Math.min(100, Math.round(100 - (Math.max(...[...weekdayMap.values(), 1]) - Math.min(...[...weekdayMap.values(), 1])) * 7)));

    const widthAvg = Math.round(average(videos.map((video) => video.thumbnailWidth)));
    const heightAvg = Math.round(average(videos.map((video) => video.thumbnailHeight)));
    const uniformityScore = Math.max(
      0,
      100 - Math.round(average(videos.map((video) => Math.abs(video.thumbnailWidth - widthAvg) + Math.abs(video.thumbnailHeight - heightAvg))) / 10)
    );

    const similarTopicMap = new Map<string, number>();
    similarChannels.forEach((channel) => {
      parseWords(`${channel.title} ${channel.description}`).slice(0, 20).forEach((word) => {
        similarTopicMap.set(word, (similarTopicMap.get(word) || 0) + 1);
      });
    });

    const thisTopicMap = new Map<string, number>();
    videos.forEach((video) => {
      parseWords(`${video.title} ${video.description}`).slice(0, 20).forEach((word) => {
        thisTopicMap.set(word, (thisTopicMap.get(word) || 0) + 1);
      });
    });

    const comparedCoverage = [...similarTopicMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([topic, count]) => ({
        topic,
        thisChannelCount: thisTopicMap.get(topic) || 0,
        similarChannelsCount: count,
      }));

    const uncoveredTopicsEstimated = comparedCoverage
      .filter((item) => item.thisChannelCount === 0 && item.similarChannelsCount >= 2)
      .slice(0, 8)
      .map((item) => item.topic);

    const expansionIdeasEstimated = comparedCoverage
      .filter((item) => item.thisChannelCount <= 1 && item.similarChannelsCount >= 2)
      .slice(0, 8)
      .map((item) => `Mở rộng chủ đề ${item.topic} theo series 3-5 video`);

    const avgViews = average(videos.map((video) => video.viewCount));
    const competitionScore = scoreCompetition(base.subscriberCount, avgViews, similarChannels.length);
    const learningValueScore = Math.max(0, Math.min(100, Math.round((avgViews > 0 ? 60 : 30) + (100 - competitionScore) * 0.35)));
    const directCompetitionDifficulty = Math.max(0, Math.min(100, Math.round(competitionScore * 0.9 + (base.subscriberCount > 500000 ? 20 : 0))));
    const saturationScoreEstimated = Math.max(0, Math.min(100, Math.round(competitionScore * 0.75 + comparedCoverage.length * 1.8)));

    const strengths = [
      avgViews > 10000 ? 'Mặt bằng view/video cao, tín hiệu phân phối tốt' : 'Video có cơ hội tăng thêm nếu tối ưu title + thumbnail',
      shortsRatio > 0.4 ? 'Khai thác Shorts mạnh để mở rộng reach' : 'Tập trung long-form rõ ràng, thuận lợi xây uy tín',
      uploadsPerWeek >= 1 ? 'Tần suất đăng ổn định' : 'Có thể tăng nhịp đăng để cải thiện đà tăng trưởng',
    ];
    const weaknesses = [
      uncoveredTopicsEstimated.length > 0 ? 'Độ phủ topic chưa đều so với kênh cùng ngách' : 'Độ phủ topic đã tương đối rộng',
      consistencyScore < 55 ? 'Lịch đăng chưa đều, khó giữ nhịp quay lại của người xem' : 'Lịch đăng tương đối đều',
      shortsRatio < 0.1 ? 'Tỷ lệ Shorts thấp, có thể bỏ lỡ traffic discovery' : 'Tỷ lệ Shorts cao cần giữ chất lượng dài hạn',
    ];

    const safeDifferentiationAnglesEstimated = [
      ...(uncoveredTopicsEstimated.slice(0, 3).map((topic) => `Đánh vào micro-topic ${topic} với case study thực chiến`)),
      'Làm series so sánh trước/sau để tạo USP rõ ràng',
      'Đóng gói cùng chủ đề theo lộ trình beginner → advanced',
    ].slice(0, 6);

    const recentUploadAt = latestVideos[0]?.publishedAt || videos[0]?.publishedAt || '';
    const activeDays = recentUploadAt ? Math.round((Date.now() - new Date(recentUploadAt).getTime()) / (1000 * 60 * 60 * 24)) : 999;
    const activeStatus = activeDays <= 7 ? 'Đang hoạt động cao' : activeDays <= 30 ? 'Hoạt động ổn định' : 'Hoạt động thấp gần đây';

    return {
      input: normalized,
      sources: [
        { title: 'YouTube Data API v3', kind: 'REAL_API', description: 'channels, search, videos' },
        { title: 'Phân tích nội bộ', kind: 'CALCULATED', description: 'ratio, frequency, consistency, scoring' },
        { title: 'Ước tính AI-assisted', kind: 'ESTIMATED', description: 'audience profile, gap, thumbnail style, strategy' },
      ],
      overview: {
        channelName: labeled(base.title, 'REAL_API'),
        channelId: labeled(base.channelId, 'REAL_API'),
        channelUrl: labeled(base.channelUrl, 'REAL_API'),
        handle: labeled(base.handle, 'REAL_API', 'Handle có thể thiếu nếu kênh không public custom URL'),
        createdAt: labeled(base.createdAt, 'REAL_API'),
        country: labeled(base.country, 'REAL_API'),
        subscriberCount: labeled(base.subscriberCount, 'REAL_API'),
        totalViews: labeled(base.totalViews, 'REAL_API'),
        totalVideos: labeled(base.totalVideos, 'REAL_API'),
        activeStatus: labeled(activeStatus, 'CALCULATED'),
        recentUploadAt: labeled(recentUploadAt, 'REAL_API'),
        avatarUrl: labeled(base.avatarUrl, 'REAL_API'),
      },
      contentAnalysis: {
        niche: labeled(themeTerms.slice(0, 3).join(' / ') || 'General', 'ESTIMATED', 'Inferred from public title + description + tags'),
        mainThemes: labeled(themeTerms.slice(0, 8), 'CALCULATED'),
        audienceEstimated: labeled(classifyAudienceEstimated(themeTerms), 'ESTIMATED', 'Inferred from public data'),
        topicClusters,
        contentFormats: labeled(contentFormats.sort((a, b) => b.count - a.count), 'CALCULATED'),
        shortsVsLong: {
          shorts: labeled(shorts.length, 'CALCULATED'),
          longVideos: labeled(longVideos.length, 'CALCULATED'),
          shortsRatio: labeled(Number(shortsRatio.toFixed(4)), 'CALCULATED'),
          betterFormat: labeled(shortsAvgViews > longAvgViews ? 'Shorts đang hiệu quả hơn theo average views' : 'Long-form đang hiệu quả hơn theo average views', 'CALCULATED'),
        },
      },
      topPerformance: {
        topViews: topVideos.slice(0, 15),
        highViewSubRatio: byViewSub,
        fastestRecentGrowthEstimated,
        growthContributionEstimated,
      },
      uploadPattern: {
        uploadsPerWeek: labeled(uploadsPerWeek, 'CALCULATED'),
        consistencyScore: labeled(consistencyScore, 'CALCULATED'),
        popularDaysVn: labeled(
          [...weekdayMap.entries()].map(([day, count]) => ({ day, count })).sort((a, b) => b.count - a.count).slice(0, 4),
          'CALCULATED'
        ),
        popularHoursVn: labeled(
          [...hourMap.entries()].map(([hour, count]) => ({ hour: Number(hour), count })).sort((a, b) => b.count - a.count).slice(0, 6),
          'CALCULATED'
        ),
        latestUploads: latestVideos.slice(0, 10).map((video) => ({
          videoId: video.id,
          title: video.title,
          publishedAtVn: formatDateTimeVN(video.publishedAt),
        })),
      },
      thumbnailDna: {
        averageResolution: labeled(`${widthAvg}x${heightAvg}`, 'REAL_API'),
        uniformityScore: labeled(Math.max(0, Math.min(100, uniformityScore)), 'CALCULATED'),
        faceUsageEstimated: labeled('Estimated: cần Vision/OCR để xác nhận khuôn mặt chính xác', 'ESTIMATED', 'Inferred from public data'),
        textDensityEstimated: labeled('Estimated: cần OCR để đo chính xác mật độ chữ trên thumbnail', 'ESTIMATED', 'AI-assisted unavailable without OCR'),
        layoutStyleEstimated: labeled(widthAvg > heightAvg ? 'Estimated: bố cục ngang chuẩn YouTube, ưu tiên one-focus layout' : 'Estimated: bố cục hỗn hợp', 'ESTIMATED'),
        dominantColorEstimated: labeled('Estimated: cần computer vision để xác định màu chủ đạo theo pixel', 'ESTIMATED'),
      },
      contentGap: {
        uncoveredTopicsEstimated: labeled(uncoveredTopicsEstimated, 'ESTIMATED', 'Compared with similar channels topic coverage'),
        expansionIdeasEstimated: labeled(expansionIdeasEstimated, 'ESTIMATED', 'AI-assisted from topic coverage delta'),
        comparedCoverage,
      },
      strategicEvaluation: {
        competitionScore: labeled(competitionScore, 'CALCULATED'),
        learningValueScore: labeled(learningValueScore, 'CALCULATED'),
        directCompetitionDifficulty: labeled(directCompetitionDifficulty, 'CALCULATED'),
        saturationScoreEstimated: labeled(saturationScoreEstimated, 'ESTIMATED', 'Inferred from topic overlap + market density'),
        strengths: labeled(strengths, 'ESTIMATED', 'AI-assisted narrative based on metrics'),
        weaknesses: labeled(weaknesses, 'ESTIMATED', 'AI-assisted narrative based on metrics'),
        safeDifferentiationAnglesEstimated: labeled(safeDifferentiationAnglesEstimated, 'ESTIMATED', 'Inferred from public data'),
      },
      similarChannels,
      compare: {
        enabled: false,
      },
      snapshot: {
        createdAt: analyzedAt,
        saveKey: `channel-snapshot-${safeJsonKey(base.channelId)}-${Date.now()}`,
        kind: 'CALCULATED',
      },
    };
  };

  const main = await analyzeOne(channelInput);
  if (!compareInput?.trim()) {
    return { main, compare: null };
  }
  const compare = await analyzeOne(compareInput);
  const summary = [
    {
      metric: 'Subscribers',
      main: main.overview.subscriberCount.value,
      compare: compare.overview.subscriberCount.value,
      winner:
        main.overview.subscriberCount.value === compare.overview.subscriberCount.value
          ? 'TIE'
          : main.overview.subscriberCount.value > compare.overview.subscriberCount.value
            ? 'MAIN'
            : 'COMPARE',
      kind: 'REAL_API' as DataKind,
    },
    {
      metric: 'Total Views',
      main: main.overview.totalViews.value,
      compare: compare.overview.totalViews.value,
      winner:
        main.overview.totalViews.value === compare.overview.totalViews.value
          ? 'TIE'
          : main.overview.totalViews.value > compare.overview.totalViews.value
            ? 'MAIN'
            : 'COMPARE',
      kind: 'REAL_API' as DataKind,
    },
    {
      metric: 'Uploads/Week',
      main: main.uploadPattern.uploadsPerWeek.value,
      compare: compare.uploadPattern.uploadsPerWeek.value,
      winner:
        main.uploadPattern.uploadsPerWeek.value === compare.uploadPattern.uploadsPerWeek.value
          ? 'TIE'
          : main.uploadPattern.uploadsPerWeek.value > compare.uploadPattern.uploadsPerWeek.value
            ? 'MAIN'
            : 'COMPARE',
      kind: 'CALCULATED' as DataKind,
    },
    {
      metric: 'Shorts Ratio',
      main: main.contentAnalysis.shortsVsLong.shortsRatio.value,
      compare: compare.contentAnalysis.shortsVsLong.shortsRatio.value,
      winner:
        main.contentAnalysis.shortsVsLong.shortsRatio.value === compare.contentAnalysis.shortsVsLong.shortsRatio.value
          ? 'TIE'
          : main.contentAnalysis.shortsVsLong.shortsRatio.value > compare.contentAnalysis.shortsVsLong.shortsRatio.value
            ? 'MAIN'
            : 'COMPARE',
      kind: 'CALCULATED' as DataKind,
    },
    {
      metric: 'Consistency Score',
      main: main.uploadPattern.consistencyScore.value,
      compare: compare.uploadPattern.consistencyScore.value,
      winner:
        main.uploadPattern.consistencyScore.value === compare.uploadPattern.consistencyScore.value
          ? 'TIE'
          : main.uploadPattern.consistencyScore.value > compare.uploadPattern.consistencyScore.value
            ? 'MAIN'
            : 'COMPARE',
      kind: 'CALCULATED' as DataKind,
    },
  ];

  main.compare = { enabled: true, summary };
  compare.compare = { enabled: true };
  return { main, compare };
};
