// ─────────────────────────────────────────────────────
// GrievAI — Redis Client (ioredis)
// Falls back gracefully if Redis is unavailable
// ─────────────────────────────────────────────────────
const Redis = require('ioredis');

let redis = null;
let redisAvailable = false;

function getRedisClient() {
  if (redis) return redis;

  const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

  redis = new Redis(url, {
    maxRetriesPerRequest: 2,
    connectTimeout: 5000,
    lazyConnect: true,
    enableOfflineQueue: false,
  });

  redis.on('connect', () => {
    redisAvailable = true;
    console.log('✅ Redis connected:', url.replace(/:\/\/.*@/, '://***@'));
  });

  redis.on('error', (err) => {
    if (redisAvailable) {
      console.warn('⚠️  Redis error (will continue without cache):', err.message);
    }
    redisAvailable = false;
  });

  redis.on('close', () => {
    redisAvailable = false;
  });

  return redis;
}

// ── Safe wrappers — never throw, always return null on failure ──

async function cacheGet(key) {
  try {
    const client = getRedisClient();
    if (!redisAvailable) return null;
    return await client.get(key);
  } catch {
    return null;
  }
}

async function cacheSet(key, value, ttlSeconds = 300) {
  try {
    const client = getRedisClient();
    if (!redisAvailable) return;
    await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // silently ignore
  }
}

async function cacheDel(key) {
  try {
    const client = getRedisClient();
    if (!redisAvailable) return;
    await client.del(key);
  } catch {}
}

async function queuePush(queueName, data) {
  try {
    const client = getRedisClient();
    if (!redisAvailable) return false;
    await client.rpush(queueName, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

async function queuePop(queueName) {
  try {
    const client = getRedisClient();
    if (!redisAvailable) return null;
    const item = await client.lpop(queueName);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
}

async function connectRedis() {
  try {
    const client = getRedisClient();
    await client.connect();
  } catch (err) {
    console.warn('⚠️  Redis not available at startup, continuing without cache:', err.message);
  }
}

module.exports = {
  getRedisClient,
  connectRedis,
  cacheGet,
  cacheSet,
  cacheDel,
  queuePush,
  queuePop,
  isRedisAvailable: () => redisAvailable,
};
