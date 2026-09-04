import type { Response } from 'express';
import { env } from '../config/env.js';

export const AUTH_COOKIE_NAME = 'sa_token';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    // The app is served single-origin (this server serves the built
    // frontend too), so 'lax' + secure-in-production is all that's needed —
    // no cross-site cookie configuration required.
    secure: env.isProduction,
    maxAge: SEVEN_DAYS_MS,
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME);
}
