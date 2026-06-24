import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'crypto';
import { cookies } from 'next/headers';

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
interface SessionPayload {
  id: string;
  username: string;
  role: string;
  exp: number;
}

function sign(data: string): string {
  return createHmac('sha256', getSecret()).update(data).digest('base64url');
}

export function createSessionToken(p: Omit<SessionPayload, 'exp'>): string {
  const payload: SessionPayload = { ...p, exp: Date.now() + SESSION_TTL_MS };
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
export async function setSessionCookie(p: Omit<SessionPayload, 'exp'>) {
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

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

export async function requireSession(): Promise<SessionPayload> {
  const s = await getSession();
  if (!s) throw new Error('UNAUTHORIZED');
  return s;
}

export async function requireAdmin(): Promise<SessionPayload> {
  const s = await requireSession();
  if (s.role !== 'admin') throw new Error('FORBIDDEN');
  return s;
}
