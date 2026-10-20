import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoose from 'mongoose';
import pinoHttp from 'pino-http';
import { logger } from './logger.js';
import { register, metricsMiddleware } from './metrics.js';
import routes from './routes.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1); // behind nginx / ingress
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(
  pinoHttp({
    logger,
    // Probes and scrapes would flood the logs.
    autoLogging: { ignore: (req) => req.url === '/health' || req.url === '/metrics' },
  }),
);
app.use(metricsMiddleware);

app.get('/health', (req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({ status: dbUp ? 'ok' : 'error', db: dbUp ? 'up' : 'down' });
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use('/api', routes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Central JSON error handler.
app.use((err, req, res, _next) => {
  let status = err.status || err.statusCode || 500;
  if (err.name === 'CastError' || err.name === 'ValidationError') status = 400;
  if (status >= 500) req.log.error({ err }, 'Unhandled error');
  res.status(status).json({ error: status >= 500 ? 'Internal server error' : err.message });
});

export default app;
