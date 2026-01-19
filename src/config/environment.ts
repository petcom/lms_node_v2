import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envFile = process.env.ENV_FILE || '.env';
const envPath = path.isAbsolute(envFile)
  ? envFile
  : path.join(__dirname, '../../', envFile);
dotenv.config({ path: envPath });

interface Config {
  env: string;
  port: number;
  mongodb: {
    uri: string;
    options: object;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    disabled: boolean;
  };
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessExpiry: string;
    refreshExpiry: string;
  };
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
  upload: {
    maxFileSize: number;
    allowedMimeTypes: string[];
  };
}

const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET'
];

// Validate required environment variables
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Environment-specific configuration
const getEnvConfig = (): Config => {
  const env = process.env.NODE_ENV || 'development';

  const baseConfig: Config = {
    env,
    port: parseInt(process.env.PORT!, 10),
    mongodb: {
      uri: process.env.MONGODB_URI!,
      options: {
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000
      }
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      disabled: process.env.DISABLE_REDIS === 'true' || process.env.DISABLE_REDIS === '1'
    },
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET!,
      refreshSecret: process.env.JWT_REFRESH_SECRET!,
      accessExpiry: env === 'production' ? '2h' : '7d',
      refreshExpiry: env === 'production' ? '7d' : '30d'
    },
    cors: {
      origin: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
        : '*',
      credentials: true
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    },
    upload: {
      maxFileSize: 500 * 1024 * 1024, // 500MB
      allowedMimeTypes: [
        'application/zip',
        'application/pdf',
        'image/jpeg',
        'image/png',
        'video/mp4'
      ]
    }
  };

  // Environment-specific overrides
  if (env === 'test') {
    baseConfig.jwt.accessExpiry = '2h';
    baseConfig.jwt.refreshExpiry = '6h';
  }

  return baseConfig;
};

export const config = getEnvConfig();
