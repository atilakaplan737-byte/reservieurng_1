import { Router } from 'express';
import { z } from 'zod';
import { getDayAvailability } from '../services/availability';

const router = Router();

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  partySize: z.coerce.number().int().min(1).max(50),
});

router.get('/', async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: 'Ungültige Parameter', issues: parsed.error.issues });
    return;
  }
  try {
    const result = await getDayAvailability(parsed.data.date, parsed.data.partySize);
    res.json(result);
  } catch (err) {
    console.error('availability error', err);
    res.status(500).json({ error: 'Verfügbarkeit konnte nicht geladen werden' });
  }
});

export default router;
