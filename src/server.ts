import app from './app';
import { connectDatabase } from './config/database';
import { config } from './config/environment';
import { logger } from './config/logger';
import { RoleRegistry } from './services/role-registry.service';
import { setRoleRegistry } from './middlewares/user-type-hydration';

async function startServer() {
  try {
    // Connect to database
    await connectDatabase();

    // Initialize RoleRegistry from database
    logger.info('Initializing RoleRegistry...');
    try {
      const registry = RoleRegistry.getInstance();
      await registry.initialize();

      if (!registry.isInitialized()) {
        logger.error('FATAL: RoleRegistry failed to initialize');
        logger.error('Required lookup values are missing from database');
        logger.error('Please run: npm run seed:constants');
        process.exit(1);
      }

      // Wire registry to middleware
      setRoleRegistry(registry);

      logger.info('RoleRegistry initialized successfully');
    } catch (error: any) {
      logger.error('FATAL: Failed to initialize RoleRegistry:', error.message);
      logger.error('Please ensure database is seeded with lookup values');
      logger.error('Run: npm run seed:constants');
      process.exit(1);
    }

    // Start server
    const server = app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.env} mode`);
    });

    // Graceful shutdown handler
    const gracefulShutdown = (signal: string) => {
      logger.info(`${signal} received. Closing server gracefully...`);
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
      
      // Force exit if graceful shutdown takes too long
      setTimeout(() => {
        logger.warn('Forcing shutdown after timeout');
        process.exit(1);
      }, 5000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));  // Ctrl+C
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
