type LiveEndpoint = {
  id: string;
  ownerUserId: string;
  platform: string;
  streamId: string;
  rtmpUrl: string;
  streamKey: string;
  embedUrl: string;
  createdAt: string;
};

const endpoints = new Map<string, LiveEndpoint>();

function streamServerBase() {
  return (process.env.LIVE_RTMP_BASE || "rtmp://localhost/live").replace(/\/$/, "");
}

export function createLiveEndpoint(ownerUserId: string, platform: string) {
  const id = crypto.randomUUID();
  const streamId = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const streamKey = crypto.randomUUID().replace(/-/g, "");
  const normalizedPlatform = platform.trim().toLowerCase() || "vlue";
  const endpoint: LiveEndpoint = {
    id,
    ownerUserId,
    platform: normalizedPlatform,
    streamId,
    streamKey,
    rtmpUrl: `${streamServerBase()}/${normalizedPlatform}`,
    embedUrl: `${process.env.APP_BASE_URL || "http://localhost:8788"}/live/${normalizedPlatform}/${streamId}`,
    createdAt: new Date().toISOString()
  };
  endpoints.set(`${normalizedPlatform}:${streamId}`, endpoint);
  return endpoint;
}

export function getEmbedMeta(platform: string, streamId: string) {
  const key = `${platform.trim().toLowerCase()}:${streamId.trim()}`;
  const row = endpoints.get(key);
  if (!row) return null;
  return {
    platform: row.platform,
    streamId: row.streamId,
    embedUrl: row.embedUrl,
    note: "traffic-cost-zero: media bytes served by external streaming infra only; API stores metadata."
  };
}

