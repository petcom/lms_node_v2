import app from './app';
import { connectDatabase } from './config/database';
import { config } from './config/environment';
import { logger } from './config/logger';

async function startServer() {
  try {
    // Connect to database
    await connectDatabase();

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
