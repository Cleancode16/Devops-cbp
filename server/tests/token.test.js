import crypto from 'node:crypto';
import { signToken, verifyToken } from '../src/token.js';

const payload = { rid: '64b000000000000000000001', eid: '64b000000000000000000002', iat: 1 };

// Swap the first character for a different valid base64url character.
const flipFirst = (s) => (s[0] === 'A' ? 'B' : 'A') + s.slice(1);

describe('token', () => {
  test('sign then verify returns the payload', () => {
    const token = signToken(payload);
    expect(token.split('.')).toHaveLength(2);
    expect(verifyToken(token)).toEqual(payload);
  });

  test('tampered payload fails', () => {
    const [, sig] = signToken(payload).split('.');
    const forgedBody = Buffer.from(JSON.stringify({ ...payload, rid: 'other' })).toString(
      'base64url',
    );
    expect(verifyToken(`${forgedBody}.${sig}`)).toBeNull();
  });

  test('tampered signature fails', () => {
    const [body, sig] = signToken(payload).split('.');
    expect(verifyToken(`${body}.${flipFirst(sig)}`)).toBeNull();
  });

  test('wrong secret fails', () => {
    const token = signToken(payload, 'secret-a');
    expect(verifyToken(token, 'secret-a')).toEqual(payload);
    expect(verifyToken(token, 'secret-b')).toBeNull();
  });

  test('malformed input fails', () => {
    expect(verifyToken(undefined)).toBeNull();
    expect(verifyToken('no-dot')).toBeNull();
    expect(verifyToken('a.b.c')).toBeNull();
  });

  test('validly signed but non-JSON or wrong-shape payload fails', () => {
    const body = Buffer.from('not-json').toString('base64url');
    const sig = crypto.createHmac('sha256', 'test-secret').update(body).digest('base64url');
    expect(verifyToken(`${body}.${sig}`)).toBeNull();
    expect(verifyToken(signToken({ rid: 123, eid: 'x' }))).toBeNull();
  });

  test('missing secret throws', () => {
    const saved = process.env.QR_SIGNING_SECRET;
    delete process.env.QR_SIGNING_SECRET;
    expect(() => signToken(payload)).toThrow('QR_SIGNING_SECRET is not set');
    process.env.QR_SIGNING_SECRET = saved;
  });
});
