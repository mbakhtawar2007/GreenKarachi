import { Router } from 'express';
import { z } from 'zod';
import { loginSchema, nurseryProfileSchema, registerSchema, getCurrentUser, getNurseryProfile, loginUser, registerUser, upsertNurseryProfile } from '../services/auth.service';
import { requireAuth, requireRoles, type RequestWithUser } from '../middleware/auth';

const router = Router();

// Supabase auth errors (e.g. 'User already registered', 'Invalid login
// credentials') reveal whether an email has an account, so they are never
// passed through: only validation messages and the post-password suspension
// notice (which requires knowing the password) keep their specific text.
const SUSPENDED_MESSAGE = 'This account has been suspended. Contact the GreenKarachi team if you believe this is a mistake.';
const authErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? fallback;
  if (error instanceof Error && error.message === SUSPENDED_MESSAGE) return error.message;
  return fallback;
};

router.post('/register', async (req, res) => {
  try {
    const parsed = registerSchema.parse(req.body);
    const result = await registerUser(parsed);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ message: authErrorMessage(error, 'Registration failed. Please check your details and try again.') });
  }
});

router.post('/login', async (req, res) => {
  try {
    const parsed = loginSchema.parse(req.body);
    const result = await loginUser(parsed);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: authErrorMessage(error, 'Login failed. Please check your email and password and try again.') });
  }
});

router.post('/logout', (_req, res) => {
  res.json({ message: 'Logged out successfully. Supabase handles the session on the client.' });
});

router.get('/me', requireAuth, async (req: RequestWithUser, res) => {
  try {
    const user = await getCurrentUser(req.user!.id);
    res.json({ user });
  } catch (error) {
    res.status(404).json({ message: (error as Error).message });
  }
});

router.get('/nursery/me', requireAuth, async (req: RequestWithUser, res) => {
  try {
    const nursery = await getNurseryProfile(req.user!.id);
    return res.json({ nursery });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load nursery profile.' });
  }
});

router.put('/nursery/me', requireAuth, requireRoles('NURSERY_OWNER'), async (req: RequestWithUser, res) => {
  try {
    const parsed = nurseryProfileSchema.parse(req.body);
    const nursery = await upsertNurseryProfile(req.user!.id, parsed);
    res.json({ nursery });
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : (error as Error).message;
    res.status(400).json({ message });
  }
});

export default router;
