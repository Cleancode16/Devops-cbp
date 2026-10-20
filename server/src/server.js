import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';
import { logger } from './logger.js';

const PORT = Number(process.env.PORT) || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/eventpass';

if (!process.env.QR_SIGNING_SECRET) {
  logger.fatal('QR_SIGNING_SECRET is not set — refusing to start');
  process.exit(1);
}

try {
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  logger.info('Connected to MongoDB');
} catch (err) {
  logger.fatal({ err }, 'Could not connect to MongoDB');
  process.exit(1);
}

mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));

const server = app.listen(PORT, () => logger.info({ port: PORT }, 'EventPass API listening'));

// Graceful shutdown: stop accepting connections, finish in-flight requests, close DB.
function shutdown(signal) {
  logger.info({ signal }, 'Shutting down');
  server.close(async () => {
    await mongoose.connection.close();
    logger.info('Shutdown complete');
    process.exit(0);
  });
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
