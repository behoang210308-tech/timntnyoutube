export const resolveYoutubeApiKey = (clientApiKey?: string) => {
  const serverKey = process.env.YOUTUBE_API_KEY?.trim();
  if (serverKey) return serverKey;

  const fallbackClientKey = clientApiKey?.trim();
  if (fallbackClientKey) return fallbackClientKey;

  return null;
};

export const resolveYoutubeApiKeyWithSource = (clientApiKey?: string) => {
  const serverKey = process.env.YOUTUBE_API_KEY?.trim();
  if (serverKey) {
    return { key: serverKey, source: 'server' as const };
  }
  const fallbackClientKey = clientApiKey?.trim();
  if (fallbackClientKey) {
    return { key: fallbackClientKey, source: 'client' as const };
  }
  return { key: null, source: 'none' as const };
};
