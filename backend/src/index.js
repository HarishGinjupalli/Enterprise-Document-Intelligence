import app from './app.js';
import config from './config/index.js';
import logger from './utils/logger.js';
import { initDatabase, closeDatabase } from './db/connection.js';

let server = null;

async function start() {
  try {
    await initDatabase();
    server = app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`, {
        env: config.env,
        apiVersion: config.apiVersion,
      });
    });
  } catch (err) {
    logger.error('Failed to start server', { error: err.message });
    process.exit(1);
  }
}

function gracefulShutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully`);
  if (server) {
    server.close(async () => {
      await closeDatabase();
      logger.info('Server closed');
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

start();
