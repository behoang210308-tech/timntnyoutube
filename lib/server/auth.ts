import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'crypto';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/server/db';

const SESSION_COOKIE = 'tn_session';
const SESSION_DURATION_DAYS = 30;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
};

export const verifyPassword = (password: string, storedHash: string) => {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const derivedHash = scryptSync(password, salt, 64).toString('hex');
  return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derivedHash, 'hex'));
};

export const createSession = async (userId: string) => {
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.authSession.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
};

export const clearSession = async () => {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.authSession.deleteMany({
      where: { tokenHash: hashToken(token) },
    });
  }
  cookies().delete(SESSION_COOKIE);
};

export const getAuthUser = async () => {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: true,
    },
  });
  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.authSession.delete({ where: { id: session.id } });
    cookies().delete(SESSION_COOKIE);
    return null;
  }

  return session.user;
};

export const normalizePhone = (phone: string) => phone.replace(/\s+/g, '').replace(/^\+/, '');

export const createReferralCode = (phone: string) => {
  const digits = phone.replace(/\D/g, '').slice(-6) || '000000';
  const suffix = randomBytes(2).toString('hex').toUpperCase();
  return `NTN${digits}${suffix}`;
};
