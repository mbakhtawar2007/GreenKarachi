import type { NextFunction, Request, Response } from 'express';
import { getSupabaseClient, isRoleAllowed, normalizeRoles, verifyToken } from '../lib/auth';

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  roles: string[];
};

export type RequestWithUser = Request & {
  user?: AuthenticatedUser;
};

export const requireAuth = (req: RequestWithUser, res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authentication required.' });
    return;
  }

  const token = header.slice('Bearer '.length);
  try {
    const decoded = verifyToken(token);
    req.user = { id: decoded.id, email: decoded.email, name: decoded.name, roles: decoded.roles };
    next();
    return;
  } catch {
    void Promise.resolve().then(() => getSupabaseClient().auth.getUser(token)).then(({ data, error }) => {
      if (error || !data.user) {
        res.status(401).json({ message: 'Invalid or expired token.' });
        return;
      }
      req.user = {
        id: data.user.id,
        email: data.user.email ?? '',
        name: String(data.user.user_metadata?.name ?? 'User'),
        roles: normalizeRoles(data.user.user_metadata?.roles as string[] | string | undefined)
      };
      next();
    }).catch(() => {
      res.status(401).json({ message: 'Invalid or expired token.' });
    });
  }
};

export const requireRoles = (...allowedRoles: string[]) => {
  return (req: RequestWithUser, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required.' });
      return;
    }

    if (!isRoleAllowed(req.user.roles, allowedRoles)) {
      res.status(403).json({ message: 'You do not have permission to access this resource.' });
      return;
    }

    next();
  };
};
