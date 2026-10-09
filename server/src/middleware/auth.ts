import type { NextFunction, Request, Response } from 'express';
import { isRoleAllowed, verifyToken } from '../lib/auth';

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

  try {
    const token = header.replace('Bearer ', '');
    const decoded = verifyToken(token);

    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      roles: decoded.roles
    };

    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token.' });
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
