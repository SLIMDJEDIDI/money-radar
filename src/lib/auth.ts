import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'crypto';
import { cookies } from 'next/headers';
import { prisma } from './db';

const SESSION_COOKIE = 'hub_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days (sliding)

function getSecret(): string {
  // Prefer an explicit secret; fall back to a derived one so the app never
  // signs with an empty key. Set SESSION_SECRET in Vercel for production.
  return (
    process.env.SESSION_SECRET ||
    process.env.DATABASE_URL ||
    'INSECURE_FALLBACK_SET_SESSION_SECRET'
  );
}

// ---------------- PASSWORD HASHING (scrypt, no external deps) ----------------
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored) return false;
  // New format: scrypt$salt$hash
  if (stored.startsWith('scrypt$')) {
    const [, salt, hash] = stored.split('$');
    if (!salt || !hash) return false;
    const derived = scryptSync(password, salt, 64);
    const stored64 = Buffer.from(hash, 'hex');
    if (stored64.length !== derived.length) return false;
    return timingSafeEqual(derived, stored64);
  }
  // Legacy plaintext (auto-upgraded on next login)
  return stored === password;
}

export function needsUpgrade(stored: string): boolean {
  return !stored.startsWith('scrypt$');
}

// ---------------- SIGNED SESSION TOKEN ----------------
export interface SessionPayload {
  id: string;
  username: string;
  role: string; // admin | assistant | emergency
  exp: number;
  epoch: number; // Global lock epoch — invalidates all old cookies when it changes
}

function sign(data: string): string {
  return createHmac('sha256', getSecret()).update(data).digest('base64url');
}

export function createSessionToken(p: Omit<SessionPayload, 'exp' | 'epoch'> & { epoch?: number }): string {
  const payload: SessionPayload = { ...p, epoch: p.epoch ?? 0, exp: Date.now() + SESSION_TTL_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionPayload;
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// ---------------- COOKIE HELPERS (server-side) ----------------
export async function setSessionCookie(p: Omit<SessionPayload, 'exp' | 'epoch'> & { epoch?: number }) {
  const token = createSessionToken(p);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export type PanicLockState = {
  isLocked: boolean;
  emergencyUsername: string | null;
  lockedAt: Date | null;
  lockedBy: string | null;
  lockEpoch: number;
};

// Security state is fail-closed: a DB/security-state outage must never silently preserve access.
export async function getPanicLockState(): Promise<PanicLockState> {
  try {
    const lock = await prisma.hubPanicLock.findUnique({ where: { id: 'global' } });
    if (!lock) {
      // The singleton is required after the Panic Lock migration. Fail closed if absent.
      return { isLocked: true, emergencyUsername: null, lockedAt: null, lockedBy: 'security-state-unavailable', lockEpoch: -1 };
    }
    return {
      isLocked: lock.isLocked,
      emergencyUsername: lock.emergencyUsername,
      lockedAt: lock.lockedAt,
      lockedBy: lock.lockedBy,
      lockEpoch: lock.lockEpoch,
    };
  } catch {
    return { isLocked: true, emergencyUsername: null, lockedAt: null, lockedBy: 'security-state-unavailable', lockEpoch: -1 };
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const payload = verifySessionToken(store.get(SESSION_COOKIE)?.value);
  if (!payload) return null;

  const lock = await getPanicLockState();
  // Epoch mismatch kills every cookie issued before a lock change.
  if ((payload.epoch ?? 0) !== lock.lockEpoch) return null;
  // While locked, only the generated emergency identity is allowed to hold a session.
  if (lock.isLocked) {
    if (payload.role !== 'emergency' || payload.username !== lock.emergencyUsername) return null;
  } else if (payload.role === 'emergency') {
    // Emergency identity ceases to exist the instant the lock is disabled.
    return null;
  }
  return payload;
}

// Normal business actions reject the emergency session by design.
export async function requireSession(): Promise<SessionPayload> {
  const s = await getSession();
  if (!s) throw new Error('UNAUTHORIZED');
  if (s.role === 'emergency') throw new Error('PANIC_LOCKED');
  return s;
}

export async function requireAdmin(): Promise<SessionPayload> {
  const s = await requireSession();
  if (s.role !== 'admin') throw new Error('FORBIDDEN');
  return s;
}
