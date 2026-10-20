import { Router } from 'express';
import mongoose from 'mongoose';
import QRCode from 'qrcode';
import { Event, Registration } from './models.js';
import { signToken, verifyToken } from './token.js';
import { registrationsTotal, checkinsTotal, checkinFailuresTotal } from './metrics.js';

const router = Router();

// Express 4 does not catch rejected promises — forward them to the error handler.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const eventView = (e) => ({
  id: e._id.toString(),
  title: e.title,
  date: e.date,
  venue: e.venue,
  capacity: e.capacity,
  registeredCount: e.registeredCount,
});

router.get(
  '/events',
  asyncHandler(async (req, res) => {
    const events = await Event.find().sort({ date: 1 }).lean();
    res.json(events.map(eventView));
  }),
);

router.post(
  '/events',
  asyncHandler(async (req, res) => {
    const { title, date, venue, capacity } = req.body ?? {};
    const parsedDate = new Date(date);
    if (
      !isNonEmptyString(title) ||
      !isNonEmptyString(venue) ||
      !date ||
      Number.isNaN(parsedDate.getTime()) ||
      !Number.isInteger(capacity) ||
      capacity < 1
    ) {
      return res.status(400).json({
        error: 'title, date, venue and capacity (integer >= 1) are required',
      });
    }
    const event = await Event.create({ title, date: parsedDate, venue, capacity });
    res.status(201).json(eventView(event));
  }),
);

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { eventId, name, email } = req.body ?? {};
    if (
      !mongoose.isValidObjectId(eventId) ||
      !isNonEmptyString(name) ||
      typeof email !== 'string' ||
      !EMAIL_RE.test(email.trim())
    ) {
      return res.status(400).json({ error: 'eventId, name and a valid email are required' });
    }
    const normalizedEmail = email.trim().toLowerCase();

    if (!(await Event.exists({ _id: eventId }))) {
      return res.status(404).json({ error: 'Event not found' });
    }
    if (await Registration.exists({ event: eventId, email: normalizedEmail })) {
      return res.status(409).json({ error: 'This email is already registered for the event' });
    }

    // Reserve a seat atomically: only increments while registeredCount < capacity.
    const event = await Event.findOneAndUpdate(
      { _id: eventId, $expr: { $lt: ['$registeredCount', '$capacity'] } },
      { $inc: { registeredCount: 1 } },
      { new: true },
    );
    if (!event) return res.status(409).json({ error: 'Event is full' });

    const registrationId = new mongoose.Types.ObjectId();
    const token = signToken({
      rid: registrationId.toString(),
      eid: event._id.toString(),
      iat: Date.now(),
    });

    try {
      await Registration.create({
        _id: registrationId,
        event: event._id,
        name: name.trim(),
        email: normalizedEmail,
        token,
      });
    } catch (err) {
      // Release the seat if the insert failed (e.g. a concurrent duplicate registration).
      await Event.updateOne({ _id: event._id }, { $inc: { registeredCount: -1 } });
      if (err.code === 11000) {
        return res.status(409).json({ error: 'This email is already registered for the event' });
      }
      throw err;
    }

    const baseUrl = (process.env.APP_BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');
    const qr = await QRCode.toDataURL(`${baseUrl}/verify?token=${encodeURIComponent(token)}`);
    registrationsTotal.inc();
    res.status(201).json({ registrationId: registrationId.toString(), token, qr });
  }),
);

router.post(
  '/verify',
  asyncHandler(async (req, res) => {
    const payload = verifyToken(req.body?.token);
    if (!payload || !mongoose.isValidObjectId(payload.rid)) {
      checkinFailuresTotal.inc({ reason: 'invalid_token' });
      return res.status(401).json({ status: 'invalid', error: 'Invalid or tampered pass' });
    }

    // Atomic check-in: only one request can flip checkedIn from false to true.
    const registration = await Registration.findOneAndUpdate(
      { _id: payload.rid, checkedIn: false },
      { $set: { checkedIn: true, checkedInAt: new Date() } },
      { new: true },
    ).populate('event');

    if (!registration) {
      const existing = await Registration.findById(payload.rid).populate('event');
      if (!existing) {
        checkinFailuresTotal.inc({ reason: 'not_found' });
        return res.status(404).json({ status: 'not_found', error: 'Registration not found' });
      }
      checkinFailuresTotal.inc({ reason: 'already_used' });
      return res.status(409).json({
        status: 'already_used',
        error: 'Pass already used',
        name: existing.name,
        event: existing.event ? eventView(existing.event) : null,
        checkedInAt: existing.checkedInAt,
      });
    }

    checkinsTotal.inc();
    res.json({
      status: 'checked_in',
      name: registration.name,
      event: registration.event ? eventView(registration.event) : null,
      checkedInAt: registration.checkedInAt,
    });
  }),
);

export default router;
