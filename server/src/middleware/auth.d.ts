import type { NextFunction, Request, Response } from 'express';
export type AuthenticatedUser = {
    id: string;
    email: string;
    name: string;
    roles: string[];
};
export type RequestWithUser = Request & {
    user?: AuthenticatedUser;
};
export declare const requireAuth: (req: RequestWithUser, res: Response, next: NextFunction) => void;
export declare const requireRoles: (...allowedRoles: string[]) => (req: RequestWithUser, res: Response, next: NextFunction) => void;
