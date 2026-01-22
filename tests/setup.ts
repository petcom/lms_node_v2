// Setup file for Jest tests
// This file runs before all tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/lms_test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

const { spawnSync } = require('node:child_process');
let canListen = false;

const envOverride = process.env.MONGO_LISTEN_ALLOWED;
if (envOverride === 'true' || envOverride === 'false') {
  canListen = envOverride === 'true';
} else {
  try {
    const listenCheck = spawnSync(process.execPath, [
      '-e',
      "const net=require('node:net');const s=net.createServer();s.on('error',()=>process.exit(1));s.listen(0,'127.0.0.1',()=>s.close(()=>process.exit(0)));"
    ], { stdio: 'ignore' });
    canListen = listenCheck.status === 0;
  } catch (error) {
    canListen = false;
  }
}
(globalThis as { __mongoListenAllowed?: boolean }).__mongoListenAllowed = canListen;
process.env.MONGO_LISTEN_ALLOWED = canListen ? 'true' : 'false';

const net = require('node:net');
const originalListen = net.Server.prototype.listen;

net.Server.prototype.listen = function (...args: any[]) {
  // Don't patch port 0 calls - supertest uses this and needs synchronous binding
  if (typeof args[0] === 'number' && args[0] === 0) {
    return originalListen.apply(this, args);
  }

  if (typeof args[0] === 'number' && (args.length === 1 || typeof args[1] === 'function')) {
    const port = args[0];
    const callback = typeof args[1] === 'function' ? args[1] : undefined;
    return originalListen.call(this, { port, host: '127.0.0.1' }, callback);
  }

  if (args[0] && typeof args[0] === 'object' && args[0].port && !args[0].host) {
    args[0] = { ...args[0], host: '127.0.0.1' };
  }

  return originalListen.apply(this, args);
};

const { MongoMemoryServer } = require('mongodb-memory-server');
const originalMongoCreate = MongoMemoryServer.create.bind(MongoMemoryServer);

MongoMemoryServer.create = (options: Record<string, unknown> = {}) => {
  const instance = { ip: '127.0.0.1', ...(options as any).instance };
  return originalMongoCreate({ ...options, instance });
};

// Mock Redis for tests
jest.mock('@/config/redis', () => {
  const redisMock = require('../tests/__mocks__/redis');
  return {
    Cache: redisMock.Cache,
    redis: redisMock.redis,
    isRedisAvailable: redisMock.isRedisAvailable,
    disconnectRedis: redisMock.disconnectRedis
  };
});

// Increase timeout for database operations
jest.setTimeout(30000);

// Suppress console logs during tests (optional)
if (process.env.SUPPRESS_TEST_LOGS === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}
