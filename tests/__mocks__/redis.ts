// Mock implementation of Redis for testing
const mockCache = new Map<string, { value: any; expiry: number }>();

export class Cache {
  static async get<T>(key: string): Promise<T | null> {
    const item = mockCache.get(key);
    if (!item) return null;

    // Check expiry
    if (item.expiry < Date.now()) {
      mockCache.delete(key);
      return null;
    }

    return item.value as T;
  }

  static async set(key: string, value: any, ttl = 7200): Promise<void> {
    mockCache.set(key, {
      value,
      expiry: Date.now() + (ttl * 1000)
    });
  }

  static async del(key: string | string[]): Promise<void> {
    if (Array.isArray(key)) {
      key.forEach(k => mockCache.delete(k));
    } else {
      mockCache.delete(key);
    }
  }

  static async delPattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern.replace('*', '.*'));
    const keysToDelete: string[] = [];

    mockCache.forEach((_, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => mockCache.delete(key));
  }

  static async exists(key: string): Promise<boolean> {
    return mockCache.has(key);
  }

  // Test helper to clear all cache
  static clearAll(): void {
    mockCache.clear();
  }
}

// Mock redis client
export const redis = {
  get: async (key: string) => {
    const item = mockCache.get(key);
    if (!item) return null;
    if (item.expiry < Date.now()) {
      mockCache.delete(key);
      return null;
    }
    return JSON.stringify(item.value);
  },
  set: async (key: string, value: string) => {
    mockCache.set(key, { value: JSON.parse(value), expiry: Date.now() + 7200000 });
    return 'OK';
  },
  setex: async (key: string, ttl: number, value: string) => {
    mockCache.set(key, { value: JSON.parse(value), expiry: Date.now() + ttl * 1000 });
    return 'OK';
  },
  del: async (...keys: string[]) => {
    keys.forEach(k => mockCache.delete(k));
    return keys.length;
  },
  keys: async (pattern: string) => {
    const regex = new RegExp(pattern.replace('*', '.*'));
    const keys: string[] = [];
    mockCache.forEach((_, key) => {
      if (regex.test(key)) keys.push(key);
    });
    return keys;
  },
  exists: async (key: string) => {
    return mockCache.has(key) ? 1 : 0;
  },
  incr: async (key: string) => {
    const item = mockCache.get(key);
    const newValue = item ? (parseInt(String(item.value), 10) || 0) + 1 : 1;
    mockCache.set(key, { value: newValue, expiry: Date.now() + 86400000 });
    return newValue;
  },
  status: 'ready',
  quit: async () => 'OK',
  disconnect: () => {},
  connect: async () => {},
  on: () => {}
};

// Mock isRedisAvailable
export const isRedisAvailable = () => false;

// Mock disconnectRedis
export const disconnectRedis = async () => {};
