import redis from "../lib/redis";

export const cacheRemember = async <T>(
  key: string,
  ttl: number,
  callback: () => Promise<T>
): Promise<T> => {

     // Disable cache during tests
  if (process.env.NODE_ENV === "test") {
    return callback();
  }
  try {
    const cached = await redis.get(key);

    if (cached) {
      console.log("✅ CACHE HIT:", key);
      return JSON.parse(cached);
    }

    console.log("❌ CACHE MISS:", key);
  } catch (err) {
    console.error("Redis GET Error:", err);
  }

  const freshData = await callback();

  try {
    await redis.setex(key, ttl, JSON.stringify(freshData));
    console.log("💾 CACHE SAVED:", key);
  } catch (err) {
    console.error("Redis SET Error:", err);
  }

  return freshData;
};