import crypto from 'node:crypto';

// Token format: base64url(JSON payload) + "." + base64url(HMAC-SHA256(payload part))
// Payload: { rid: registrationId, eid: eventId, iat: issuedAt (ms) }

function getSecret(secret) {
  const value = secret ?? process.env.QR_SIGNING_SECRET;
  if (!value) throw new Error('QR_SIGNING_SECRET is not set');
  return value;
}

function hmac(data, secret) {
  return crypto.createHmac('sha256', getSecret(secret)).update(data).digest('base64url');
}

export function signToken(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${hmac(body, secret)}`;
}

// Returns the payload when the signature is valid, otherwise null.
export function verifyToken(token, secret) {
  if (typeof token !== 'string') return null;
  const parts = token.trim().split('.');
  if (parts.length !== 2) return null;
  const [body, signature] = parts;

  // Compare the exact base64url strings so no alternate encoding of the same bytes is accepted.
  const expected = Buffer.from(hmac(body, secret));
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload || typeof payload.rid !== 'string' || typeof payload.eid !== 'string') return null;
    return payload;
  } catch {
    return null;
  }
}
