//apps/backend/src/controllers/auth/controller
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { getJwtSecret, getRefreshSecret } from '../utils/env';
import { randomBytes } from 'crypto';

// Schemas
const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'STUDENT'])
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  deviceId: z.string().min(1)
});

const refreshSchema = z.object({
  refreshToken: z.string().optional()
});

const fcmTokenSchema = z.object({
  fcmToken: z.string()
});

const passwordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(6)
});

// Helper for tokens
const generateTokens = (userId: string, role: string) => {
  const jwtSecret = getJwtSecret();
  const refreshSecret = getRefreshSecret();
  const accessToken = jwt.sign({ userId, role }, jwtSecret, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId }, refreshSecret, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_CSRF_NAME = 'refreshCsrf';

const setRefreshCookie = (res: Response, refreshToken: string): string => {
  const isProd = process.env.NODE_ENV === 'production';
  // Generate a CSRF token for double-submit cookie pattern
  const csrf = randomBytes(16).toString('hex');

  // HttpOnly refresh token cookie
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  // Readable CSRF cookie (accessible from JS) for double-submit pattern.
  // Set path to '/' so frontend JS can read it from application pages.
  res.cookie(REFRESH_CSRF_NAME, csrf, {
    httpOnly: false,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return csrf;
};

const clearRefreshCookie = (res: Response) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/api/v1/auth',
  });
  res.clearCookie(REFRESH_CSRF_NAME, {
    httpOnly: false,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  });
};

type RefreshSource = 'body' | 'cookie' | null;
const getRefreshTokenAndSource = (req: Request): { token: string | null; source: RefreshSource } => {
  const parsed = refreshSchema.safeParse(req.body);
  if (parsed.success && parsed.data.refreshToken) return { token: parsed.data.refreshToken, source: 'body' };
  const cookieToken = (req as Request & { cookies?: Record<string, string | undefined> }).cookies?.[REFRESH_COOKIE_NAME];
  if (cookieToken) return { token: cookieToken, source: 'cookie' };
  return { token: null, source: null };
};

export const register = async (req: Request, res: Response): Promise<Response> => {
  try {
    const data = registerSchema.parse(req.body);

    if (data.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Only ADMIN role can self-register. Students must be added by an admin.'
      });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Validation error', details: [] });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        studentCode: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return res.status(201).json({
      message: 'Admin registered successfully',
      user
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};

export const login = async (req: Request, res: Response): Promise<Response> => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid email or password' });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(401).json({
        error: 'ACCOUNT_SUSPENDED',
        message: 'Your account has been suspended. Contact admin for details.'
      });
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid email or password' });
    }

    if (user.role === 'STUDENT') {
      await prisma.session.deleteMany({
        where: { userId: user.id }
      });
    }

    // Update the user's device ID so GET /auth/me returns the current device
    await prisma.user.update({
      where: { id: user.id },
      data: { deviceId: data.deviceId },
    });

    const { accessToken, refreshToken } = generateTokens(user.id, user.role);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        deviceId: data.deviceId,
        expiresAt
      }
    });

    const csrf = setRefreshCookie(res, refreshToken);

    return res.status(200).json({
      accessToken,
      refreshToken,
      csrfToken: csrf,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentCode: user.studentCode
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};

export const refresh = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { token: refreshToken, source } = getRefreshTokenAndSource(req);
    if (!refreshToken) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Missing refresh token' });
    }

    // If the refresh token came from the cookie, require a matching CSRF header (double-submit)
    if (source === 'cookie') {
      const headerCsrf = (req.headers['x-csrf-token'] as string | undefined) ?? null;
      const cookieCsrf = (req as Request & { cookies?: Record<string, string | undefined> }).cookies?.[REFRESH_CSRF_NAME] ?? null;
      if (!headerCsrf || headerCsrf !== cookieCsrf) {
        return res.status(403).json({ error: 'CSRF_MISMATCH', message: 'Missing or invalid CSRF token' });
      }
    }

    const session = await prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true }
    });

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Invalid or expired refresh token'
      });
    }
    
    if (session.user.status !== 'ACTIVE') {
      return res.status(401).json({
        error: 'ACCOUNT_SUSPENDED',
        message: 'Your account has been suspended. Contact admin for details.'
      });
    }

    try {
      jwt.verify(refreshToken, getRefreshSecret());
    } catch (e) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Invalid or expired refresh token'
      });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(session.user.id, session.user.role);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.session.update({
      where: { id: session.id },
      data: {
        refreshToken: newRefreshToken,
        expiresAt
      }
    });

    const csrf = setRefreshCookie(res, newRefreshToken);

    return res.status(200).json({
      accessToken,
      refreshToken: newRefreshToken,
      csrfToken: csrf
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};

export const logout = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { token: refreshToken, source } = getRefreshTokenAndSource(req);
    if (!refreshToken) {
      clearRefreshCookie(res);
      return res.status(200).json({ message: 'Logged out successfully' });
    }

    // If logout uses cookie-based refresh token, require CSRF header
    if (source === 'cookie') {
      const headerCsrf = (req.headers['x-csrf-token'] as string | undefined) ?? null;
      const cookieCsrf = (req as Request & { cookies?: Record<string, string | undefined> }).cookies?.[REFRESH_CSRF_NAME] ?? null;
      if (!headerCsrf || headerCsrf !== cookieCsrf) {
        return res.status(403).json({ error: 'CSRF_MISMATCH', message: 'Missing or invalid CSRF token' });
      }
    }

    await prisma.session.deleteMany({
      where: {
        refreshToken,
        userId: req.user!.id,
      },
    });

    clearRefreshCookie(res);
    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};

export const getMe = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        studentCode: true,
        deviceId: true,
        fcmToken: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }

    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};

export const updateFcmToken = async (req: Request, res: Response): Promise<Response> => {
  try {
    const data = fcmTokenSchema.parse(req.body);

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { fcmToken: data.fcmToken }
    });

    return res.status(200).json({ message: 'FCM token updated' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};

export const changePassword = async (req: Request, res: Response): Promise<Response> => {
  try {
    const data = passwordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }

    const isPasswordValid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Current password is incorrect'
      });
    }

    const passwordHash = await bcrypt.hash(data.newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });

    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
};
