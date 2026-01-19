import path from 'path';
import dotenv from 'dotenv';

export const loadEnv = (): string => {
  const envFile = process.env.ENV_FILE || '.env';
  const envPath = path.isAbsolute(envFile)
    ? envFile
    : path.join(process.cwd(), envFile);

  dotenv.config({ path: envPath });
  return envPath;
};
