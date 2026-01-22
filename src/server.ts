import app from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { config } from './config/environment';
import { logger } from './config/logger';
import { disconnectRedis } from './config/redis';
import { RoleRegistry } from './services/role-registry.service';
import { setRoleRegistry } from './middlewares/userTypeHydration';
import { roleCache } from './services/auth/role-cache.service';
import { departmentCacheService } from './services/auth/department-cache.service';

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

    // Initialize caches (non-fatal - will fallback to database queries if initialization fails)
    logger.info('Initializing authorization caches...');
    try {
      await roleCache.initialize();
      const roleCacheStats = roleCache.getStats();
      logger.info(`RoleCache initialized: ${roleCacheStats.size} role definitions cached`);
    } catch (error: any) {
      logger.warn('RoleCache initialization failed - will fallback to database queries:', error.message);
    }

    try {
      await departmentCacheService.initialize();
      const deptCacheStats = departmentCacheService.getStats();
      logger.info(
        `DepartmentCache initialized: ${deptCacheStats.parentToChildrenCount} parent->children mappings, ` +
        `${deptCacheStats.childToParentCount} child->parent mappings`
      );
    } catch (error: any) {
      logger.warn('DepartmentCache initialization failed - will fallback to database queries:', error.message);
    }

    // Start server
    const server = app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.env} mode`);
    });

    // Graceful shutdown handler
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received. Closing server gracefully...`);

      // Close all keep-alive connections immediately
      server.closeAllConnections();

      server.close(async () => {
        logger.info('HTTP server closed');
        try {
          // Clear caches before disconnecting
          logger.info('Clearing authorization caches...');
          roleCache.clear();
          departmentCacheService.shutdown();
          logger.info('Authorization caches cleared');

          await disconnectRedis();
          await disconnectDatabase();
          logger.info('All connections closed. Exiting.');
          process.exit(0);
        } catch (err) {
          logger.error('Error during cleanup:', err);
          process.exit(1);
        }
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
