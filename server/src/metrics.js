import client from 'prom-client';

export const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

export const registrationsTotal = new client.Counter({
  name: 'registrations_total',
  help: 'Successful event registrations',
  registers: [register],
});

export const checkinsTotal = new client.Counter({
  name: 'checkins_total',
  help: 'Successful pass check-ins',
  registers: [register],
});

export const checkinFailuresTotal = new client.Counter({
  name: 'checkin_failures_total',
  help: 'Rejected pass check-ins by reason',
  labelNames: ['reason'],
  registers: [register],
});

// Pre-create every reason at 0 so Grafana shows all series from the start.
for (const reason of ['invalid_token', 'not_found', 'already_used']) {
  checkinFailuresTotal.inc({ reason }, 0);
}

// Records count + latency per request. The route label uses the matched Express
// route pattern (e.g. /api/events) to keep label cardinality low.
export function metricsMiddleware(req, res, next) {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    const route = req.route ? `${req.baseUrl}${req.route.path}` : 'unmatched';
    const labels = { method: req.method, route, status: String(res.statusCode) };
    httpRequestsTotal.inc(labels);
    end(labels);
  });
  next();
}
