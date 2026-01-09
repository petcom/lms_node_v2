import Redis from 'ioredis';
import { config } from './environment';
import { logger } from './logger';

const redisConfig = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  retryStrategy: (times: number) => {
    // Stop retrying after 3 attempts in development
    if (config.env === 'development' && times > 3) {
      logger.warn('Redis unavailable - running without cache');
      return null; // Stop retrying
    }
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  lazyConnect: true, // Don't connect immediately
  enableOfflineQueue: false // Don't queue commands when disconnected
};

export const redis = new Redis(redisConfig);

let isRedisConnected = false;

redis.on('connect', () => {
  isRedisConnected = true;
  logger.info('Redis connected successfully');
});

redis.on('error', (error) => {
  if (config.env !== 'development') {
    logger.error('Redis connection error:', error);
  }
});

redis.on('close', () => {
  isRedisConnected = false;
  if (config.env !== 'development') {
    logger.warn('Redis connection closed');
  }
});

// Try to connect, but don't fail if Redis is unavailable
redis.connect().catch(() => {
  if (config.env === 'development') {
    logger.info('Redis not available - running without cache (optional in development)');
  } else {
    logger.error('Redis connection failed - cache disabled');
  }
});

export const isRedisAvailable = () => isRedisConnected;

/**
 * Cache helper functions
 */
export class Cache {
  /**
   * Get cached value
   */
  static async get<T>(key: string): Promise<T | null> {
    if (!isRedisAvailable()) return null;
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached value with TTL (in seconds)
   */
  static async set(key: string, value: any, ttl = 7200): Promise<void> {
    if (!isRedisAvailable()) return;
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete cached value
   */
  static async del(key: string | string[]): Promise<void> {
    if (!isRedisAvailable()) return;
    try {
      if (Array.isArray(key)) {
        await redis.del(...key);
      } else {
        await redis.del(key);
      }
    } catch (error) {
      logger.error(`Cache delete error:`, error);
    }
  }

  /**
   * Delete keys by pattern
   */
  static async delPattern(pattern: string): Promise<void> {
    if (!isRedisAvailable()) return;
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.error(`Cache delete pattern error:`, error);
    }
  }

  /**
   * Check if key exists
   */
  static async exists(key: string): Promise<boolean> {
    if (!isRedisAvailable()) return false;
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }
}
