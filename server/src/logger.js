import pino from 'pino';

// JSON logs to stdout only — read them with `docker compose logs` / `kubectl logs`.
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: { service: 'eventpass-server' },
  timestamp: pino.stdTimeFunctions.isoTime,
});
