import redis from "../lib/redis";

const isTest = process.env.NODE_ENV === "test";
const isDev = process.env.NODE_ENV !== "production";

const toJson = (data: unknown) =>
  JSON.stringify(data, (_key, value) =>
    typeof value === "bigint" ? value.toString() : value
  );

const log = (...args: unknown[]) => {
  if (isDev) console.log(...args);
};

export const cacheKeyFromQuery = (
  prefix: string,
  query: Record<string, unknown> = {}
) => {
  const parts = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${String(value)}`);

  return `${prefix}:${parts.join("&") || "default"}`;
};

export const cacheRemember = async <T>(
  key: string,
  ttl: number,
  callback: () => Promise<T>
): Promise<T> => {
  if (isTest) {
    return callback();
  }

  try {
    const cached = await redis.get(key);

    if (cached) {
      log("✅ CACHE HIT:", key);
      return JSON.parse(cached) as T;
    }

    log("❌ CACHE MISS:", key);
  } catch (err) {
    console.error("Redis GET Error:", err);
  }

  const freshData = await callback();

  try {
    await redis.setex(key, ttl, toJson(freshData));
    log("💾 CACHE SAVED:", key);
  } catch (err) {
    console.error("Redis SET Error:", err);
  }

  return freshData;
};

export const cacheForget = async (key: string) => {
  if (isTest) return;
  try {
    await redis.del(key);
  } catch (err) {
    console.error("Redis DEL Error:", err);
  }
};

export const cacheForgetByPrefix = async (prefix: string) => {
  if (isTest) return;

  try {
    let cursor = "0";

    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        "MATCH",
        `${prefix}*`,
        "COUNT",
        100
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== "0");
  } catch (err) {
    console.error("Redis SCAN/DEL Error:", err);
  }
};

export const invalidateProjectCaches = async () => {
  await Promise.all([
    cacheForgetByPrefix("featured:projects:"),
    cacheForgetByPrefix("projects:list:"),
    cacheForgetByPrefix("project:slug:"),
    cacheForgetByPrefix("project:id:"),
    cacheForgetByPrefix("projects:builder:"),
    cacheForgetByPrefix("projects:investment:"),
    cacheForget("projects:filter-counts"),
  ]);
};

export const invalidateLocationCaches = async () => {
  await Promise.all([
    cacheForgetByPrefix("cities:"),
    cacheForgetByPrefix("city:"),
    cacheForgetByPrefix("localities:"),
    cacheForgetByPrefix("location-search:"),
  ]);
};

export const invalidateArticleCaches = async () => {
  await Promise.all([
    cacheForgetByPrefix("articles:public:"),
    cacheForgetByPrefix("article:slug:"),
    cacheForget("articles:categories"),
    cacheForget("articles:tags"),
  ]);
};
