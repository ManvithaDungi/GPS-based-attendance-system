import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * POST /api/auth/register
 * Register new user (student or admin)
 */
router.post('/register', async (req: Request, res: Response) => {
  // TODO: Validate input with Zod schema
  // TODO: Check if user email already exists
  // TODO: Hash password with bcrypt
  // TODO: Create user in database
  // TODO: Generate JWT tokens (access + refresh)
  // TODO: Return tokens and user data
  // TODO: Handle errors appropriately

  res.json({ message: 'Register endpoint - TODO: implement' });
});

/**
 * POST /api/auth/login
 * Login user with email and password
 */
router.post('/login', async (req: Request, res: Response) => {
  // TODO: Validate input with Zod schema
  // TODO: Find user by email
  // TODO: Compare password with hash using bcrypt
  // TODO: Generate JWT tokens (access + refresh)
  // TODO: Store refresh token in database (Session model)
  // TODO: Return tokens and user data
  // TODO: Handle user not found or wrong password

  res.json({ message: 'Login endpoint - TODO: implement' });
});

/**
 * POST /api/auth/refresh
 * Refresh JWT access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  // TODO: Extract refresh token from request
  // TODO: Validate refresh token
  // TODO: Find session in database
  // TODO: Check if refresh token not expired
  // TODO: Generate new access token
  // TODO: Return new access token
  // TODO: Handle expired or invalid refresh token

  res.json({ message: 'Refresh endpoint - TODO: implement' });
});

/**
 * POST /api/auth/logout
 * Logout user - invalidate refresh token
 */
router.post('/logout', authMiddleware, async (req: Request, res: Response) => {
  // TODO: Get user from authenticated request
  // TODO: Delete all sessions for this user from database
  // TODO: Return success response

  res.json({ message: 'Logout endpoint - TODO: implement' });
});

export default router;
