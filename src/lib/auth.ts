import { hash, compare } from 'bcryptjs';
import { sign, verify } from 'jsonwebtoken';
import { prisma } from './prisma';
import { AuthError } from './error-handler';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  role?: string | null;
}

export async function createUser(email: string, password: string, name?: string) {
  const hashedPassword = await hash(password, 10);
  
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
    },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  };
}

export async function verifyUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.password) {
    throw new AuthError('Invalid credentials');
  }

  const isValid = await compare(password, user.password);
  if (!isValid) {
    throw new AuthError('Invalid credentials');
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  };
}

export function generateToken(user: AuthUser) {
  return sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): AuthUser {
  try {
    return verify(token, JWT_SECRET) as AuthUser;
  } catch {
    throw new AuthError('Invalid or expired token');
  }
}

export async function getUserFromToken(token: string) {
  const decoded = verifyToken(token);
  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
  });

  if (!user) {
    throw new AuthError('User not found or deactivated');
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  };
}
