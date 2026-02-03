import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../Errors';
import { TokenPayload, Role } from '../types/custom';
import 'dotenv/config';

const JWT_SECRET = process.env.JWT_SECRET as string;

// ═══════════════════════════════════════════════════════════════
// 🔐 GENERATE TOKEN
// ═══════════════════════════════════════════════════════════════

export const generateToken = (data: {
  id: string;
  name: string;
  role: Role;
}): string => {
  const payload: TokenPayload = {
    id: data.id,
    name: data.name,
    role: data.role,
  };

  // admin = 7 days, user = 30 days
  const expiresIn = data.role === 'admin' ? '7d' : '30d';

  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

// ═══════════════════════════════════════════════════════════════
// ✅ VERIFY TOKEN
// ═══════════════════════════════════════════════════════════════

export const verifyToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    throw new UnauthorizedError('التوكن غير صالح أو منتهي الصلاحية');
  }
};

// ═══════════════════════════════════════════════════════════════
// 🔄 REFRESH TOKEN
// ═══════════════════════════════════════════════════════════════

export const refreshToken = (oldToken: string): string => {
  const decoded = verifyToken(oldToken);
  const { iat, exp, ...payload } = decoded;

  const expiresIn = payload.role === 'admin' ? '7d' : '30d';

  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};