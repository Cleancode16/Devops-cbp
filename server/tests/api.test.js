import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { Event, Registration } from '../src/models.js';
import { signToken } from '../src/token.js';

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Registration.init(); // make sure the unique {event, email} index exists
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Event.deleteMany({});
  await Registration.deleteMany({});
});

const createEvent = (overrides = {}) =>
  request(app)
    .post('/api/events')
    .send({
      title: 'DevOps Meetup',
      date: '2030-01-15T18:00:00.000Z',
      venue: 'Hall A',
      capacity: 5,
      ...overrides,
    });

const register = (eventId, email = 'ada@example.com', name = 'Ada') =>
  request(app).post('/api/register').send({ eventId, name, email });

describe('events', () => {
  test('create and list events', async () => {
    const created = await createEvent();
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ title: 'DevOps Meetup', capacity: 5, registeredCount: 0 });

    const list = await request(app).get('/api/events');
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].id).toBe(created.body.id);
  });

  test('invalid event returns 400', async () => {
    expect((await createEvent({ title: '' })).status).toBe(400);
    expect((await createEvent({ capacity: 0 })).status).toBe(400);
    expect((await createEvent({ date: 'not-a-date' })).status).toBe(400);
  });
});

describe('register', () => {
  test('returns token and QR data URL', async () => {
    const { body: event } = await createEvent();
    const res = await register(event.id);
    expect(res.status).toBe(201);
    expect(res.body.registrationId).toBeDefined();
    expect(res.body.token).toContain('.');
    expect(res.body.qr).toMatch(/^data:image\/png;base64,/);

    const list = await request(app).get('/api/events');
    expect(list.body[0].registeredCount).toBe(1);
  });

  test('full event returns 409', async () => {
    const { body: event } = await createEvent({ capacity: 1 });
    expect((await register(event.id, 'a@example.com')).status).toBe(201);
    const res = await register(event.id, 'b@example.com');
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/full/i);
  });

  test('duplicate email returns 409', async () => {
    const { body: event } = await createEvent();
    expect((await register(event.id, 'dup@example.com')).status).toBe(201);
    const res = await register(event.id, 'DUP@example.com');
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already registered/i);
  });

  test('bad input returns 400 and unknown event returns 404', async () => {
    expect((await register('not-an-id')).status).toBe(400);
    const { body: event } = await createEvent();
    expect((await register(event.id, 'not-an-email')).status).toBe(400);
    expect((await register(new mongoose.Types.ObjectId().toString())).status).toBe(404);
  });
});

describe('verify', () => {
  test('first check-in succeeds, reuse returns 409', async () => {
    const { body: event } = await createEvent();
    const { body: pass } = await register(event.id);

    const first = await request(app).post('/api/verify').send({ token: pass.token });
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ status: 'checked_in', name: 'Ada' });
    expect(first.body.event.title).toBe('DevOps Meetup');

    const second = await request(app).post('/api/verify').send({ token: pass.token });
    expect(second.status).toBe(409);
    expect(second.body.status).toBe('already_used');
  });

  test('invalid or tampered token returns 401', async () => {
    const { body: event } = await createEvent();
    const { body: pass } = await register(event.id);
    const [body, sig] = pass.token.split('.');
    const tampered = `${body}.${sig[0] === 'A' ? 'B' : 'A'}${sig.slice(1)}`;

    expect((await request(app).post('/api/verify').send({ token: tampered })).status).toBe(401);
    expect((await request(app).post('/api/verify').send({ token: 'garbage' })).status).toBe(401);
    expect((await request(app).post('/api/verify').send({})).status).toBe(401);
  });

  test('validly signed token for unknown registration returns 404', async () => {
    const token = signToken({
      rid: new mongoose.Types.ObjectId().toString(),
      eid: new mongoose.Types.ObjectId().toString(),
      iat: Date.now(),
    });
    const res = await request(app).post('/api/verify').send({ token });
    expect(res.status).toBe(404);
  });
});

describe('ops endpoints', () => {
  test('GET /health reports db up', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'up' });
  });

  test('GET /metrics exposes Prometheus metrics', async () => {
    await request(app).get('/api/events');
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
    for (const name of [
      'http_requests_total',
      'http_request_duration_seconds',
      'registrations_total',
      'checkins_total',
      'checkin_failures_total',
      'process_cpu_user_seconds_total',
    ]) {
      expect(res.text).toContain(name);
    }
  });

  test('unknown route returns 404 and malformed JSON returns 400', async () => {
    expect((await request(app).get('/api/nope')).status).toBe(404);
    const res = await request(app)
      .post('/api/events')
      .set('Content-Type', 'application/json')
      .send('{"bad json"');
    expect(res.status).toBe(400);
  });

  // Keep last: closes the DB connection.
  test('GET /health returns 503 when the database is down', async () => {
    await mongoose.disconnect();
    const res = await request(app).get('/health');
    expect(res.status).toBe(503);
    expect(res.body.db).toBe('down');
  });
});
