export type DataKind = 'REAL_API' | 'CALCULATED' | 'ESTIMATED';

export interface LabeledValue<T> {
  value: T;
  kind: DataKind;
  note?: string;
}

export interface SourceLabel {
  title: string;
  kind: DataKind;
  description: string;
}

export interface ChannelInputNormalized {
  raw: string;
  query: string;
  channelId?: string;
  handle?: string;
  mode: 'channelId' | 'handle' | 'query';
}

export interface ChannelBase {
  channelId: string;
  title: string;
  description: string;
  avatarUrl: string;
  handle: string;
  channelUrl: string;
  createdAt: string;
  country: string;
  subscriberCount: number;
  totalViews: number;
  totalVideos: number;
}

export interface ChannelVideo {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  duration: string;
  durationSeconds: number;
  categoryId: string;
  tags: string[];
  viewCount: number;
  likeCount: number;
  commentCount: number;
  thumbnailUrl: string;
  thumbnailWidth: number;
  thumbnailHeight: number;
}

export interface TopicCluster {
  topic: string;
  videoCount: number;
  avgViews: number;
  kind: DataKind;
}

export interface SimilarChannel {
  channelId: string;
  title: string;
  description: string;
  subscriberCount: number;
  totalViews: number;
  totalVideos: number;
  matchedTopics: string[];
}

export interface AnalyzedChannelPayload {
  input: ChannelInputNormalized;
  sources: SourceLabel[];
  overview: {
    channelName: LabeledValue<string>;
    channelId: LabeledValue<string>;
    channelUrl: LabeledValue<string>;
    handle: LabeledValue<string>;
    createdAt: LabeledValue<string>;
    country: LabeledValue<string>;
    subscriberCount: LabeledValue<number>;
    totalViews: LabeledValue<number>;
    totalVideos: LabeledValue<number>;
    activeStatus: LabeledValue<string>;
    recentUploadAt: LabeledValue<string>;
    avatarUrl: LabeledValue<string>;
  };
  contentAnalysis: {
    niche: LabeledValue<string>;
    mainThemes: LabeledValue<string[]>;
    audienceEstimated: LabeledValue<string>;
    topicClusters: TopicCluster[];
    contentFormats: LabeledValue<Array<{ format: string; count: number; avgViews: number }>>;
    shortsVsLong: {
      shorts: LabeledValue<number>;
      longVideos: LabeledValue<number>;
      shortsRatio: LabeledValue<number>;
      betterFormat: LabeledValue<string>;
    };
  };
  topPerformance: {
    topViews: ChannelVideo[];
    highViewSubRatio: Array<ChannelVideo & { viewSubRatio: number }>;
    fastestRecentGrowthEstimated: Array<ChannelVideo & { estimatedGrowthScore: number }>;
    growthContributionEstimated: Array<{ videoId: string; title: string; contributionRate: number }>;
  };
  uploadPattern: {
    uploadsPerWeek: LabeledValue<number>;
    consistencyScore: LabeledValue<number>;
    popularDaysVn: LabeledValue<Array<{ day: string; count: number }>>;
    popularHoursVn: LabeledValue<Array<{ hour: number; count: number }>>;
    latestUploads: Array<{ videoId: string; title: string; publishedAtVn: string }>;
  };
  thumbnailDna: {
    averageResolution: LabeledValue<string>;
    uniformityScore: LabeledValue<number>;
    faceUsageEstimated: LabeledValue<string>;
    textDensityEstimated: LabeledValue<string>;
    layoutStyleEstimated: LabeledValue<string>;
    dominantColorEstimated: LabeledValue<string>;
  };
  contentGap: {
    uncoveredTopicsEstimated: LabeledValue<string[]>;
    expansionIdeasEstimated: LabeledValue<string[]>;
    comparedCoverage: Array<{ topic: string; thisChannelCount: number; similarChannelsCount: number }>;
  };
  strategicEvaluation: {
    competitionScore: LabeledValue<number>;
    learningValueScore: LabeledValue<number>;
    directCompetitionDifficulty: LabeledValue<number>;
    saturationScoreEstimated: LabeledValue<number>;
    strengths: LabeledValue<string[]>;
    weaknesses: LabeledValue<string[]>;
    safeDifferentiationAnglesEstimated: LabeledValue<string[]>;
  };
  similarChannels: SimilarChannel[];
  compare: {
    enabled: boolean;
    summary?: Array<{
      metric: string;
      main: number | string;
      compare: number | string;
      winner: 'MAIN' | 'COMPARE' | 'TIE';
      kind: DataKind;
    }>;
  };
  snapshot: {
    createdAt: string;
    saveKey: string;
    kind: DataKind;
  };
}
