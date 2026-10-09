import { Router } from 'express';
import { z } from 'zod';
import { loginSchema, nurseryProfileSchema, registerSchema, getCurrentUser, getNurseryProfile, loginUser, registerUser, upsertNurseryProfile } from '../services/auth.service';
import { requireAuth, requireRoles, type RequestWithUser } from '../middleware/auth';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const parsed = registerSchema.parse(req.body);
    const result = await registerUser(parsed);
    res.status(201).json(result);
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : (error as Error).message;
    res.status(400).json({ message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const parsed = loginSchema.parse(req.body);
    const result = await loginUser(parsed);
    res.json(result);
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : (error as Error).message;
    res.status(400).json({ message });
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
    return res.status(500).json({ message: (error as Error).message });
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

router.get('/admin/users', requireAuth, requireRoles('ADMIN'), async (_req, res) => {
  res.json({ users: [], message: 'User listing is handled in Supabase tables or your admin dashboard.' });
});

export default router;
