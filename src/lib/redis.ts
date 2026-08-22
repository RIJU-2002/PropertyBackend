// lib/redis.ts
// import Redis from "ioredis";

// const redis = new Redis(process.env.REDIS_URL!);
// export default redis;


import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL!, {
  enableReadyCheck: true,
  maxRetriesPerRequest: 2,
  connectTimeout: 2000,
  commandTimeout: 1000,
  enableOfflineQueue: false,

  retryStrategy(times) {
    if (times > 10) return null;
    return Math.min(times * 500, 3000);
  },
});

redis.on("connect", () => {
  console.log("✅ Redis connected");
});

redis.on("ready", () => {
  console.log("✅ Redis ready");
});

redis.on("close", () => {
  console.log("❌ Redis connection closed");
});

redis.on("reconnecting", () => {
  console.log("🔄 Redis reconnecting...");
});

redis.on("error", (err) => {
  console.error("❌ Redis Error:", err.message);
});

export default redis;