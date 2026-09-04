import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { signToken } from '../utils/jwt.js';
import { setAuthCookie, clearAuthCookie } from '../utils/authCookie.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { isRequired, isValidEmail, minLength } from '../utils/validation.js';
import type { PublicUser } from '../types.js';

export const authRouter = Router();

function toPublicUser(user: { _id: unknown; name: string; email: string }): PublicUser {
  return { id: String(user._id), name: user.name, email: user.email };
}

authRouter.post('/signup', async (req, res) => {
  const { name, email, password } = req.body ?? {};

  if (!isRequired(name)) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }
  if (!isRequired(email) || !isValidEmail(email)) {
    res.status(400).json({ error: 'A valid email is required' });
    return;
  }
  if (!isRequired(password) || !minLength(password, 6)) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    res.status(409).json({ error: 'Email already in use' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name: name.trim(), email: normalizedEmail, passwordHash });

  const token = signToken(String(user._id));
  setAuthCookie(res, token);
  res.status(201).json({ user: toPublicUser(user) });
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!isRequired(email) || !isRequired(password)) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = signToken(String(user._id));
  setAuthCookie(res, token);
  res.status(200).json({ user: toPublicUser(user) });
});

authRouter.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  res.status(200).json({ user: toPublicUser(user) });
});
