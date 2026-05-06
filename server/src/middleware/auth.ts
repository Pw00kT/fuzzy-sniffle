import { Request, Response, NextFunction } from 'express';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = process.env.AUTH_TOKEN;
  if (!token) return next(); // auth disabled

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (authHeader.slice(7) !== token) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  next();
}
