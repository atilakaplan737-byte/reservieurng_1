import type { NextFunction, Request, Response } from 'express';
import { getDb } from '../db/database';

export interface AdminRequest extends Request {
  adminAuthenticated?: boolean;
}

export async function requireAdmin(req: AdminRequest, res: Response, next: NextFunction): Promise<void> {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Nicht angemeldet' });
    return;
  }

  const token = auth.slice('Bearer '.length).trim();
  if (!token) {
    res.status(401).json({ error: 'Nicht angemeldet' });
    return;
  }

  const db = getDb();
  const result = await db.query(
    'SELECT id FROM admin_sessions WHERE token = $1 AND expires_at > NOW()',
    [token],
  );

  if (result.rowCount === 0) {
    res.status(401).json({ error: 'Session abgelaufen' });
    return;
  }

  req.adminAuthenticated = true;
  next();
}
