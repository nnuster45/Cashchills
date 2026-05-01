import jwt from 'jsonwebtoken';

const APP_JWT_SECRET = process.env.APP_JWT_SECRET || '';

export interface TokenPayload {
  userId: string;
  email: string;
}

function getJwtSecret() {
  if (!APP_JWT_SECRET) {
    throw new Error('APP_JWT_SECRET is not configured');
  }
  return APP_JWT_SECRET;
}

export function signToken(payload: TokenPayload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

export function verifyToken(token: string) {
  return jwt.verify(token, getJwtSecret()) as TokenPayload;
}
