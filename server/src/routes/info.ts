import { Router } from 'express';
import { getSettings } from '../services/settings';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const s = await getSettings();
    res.json({
      restaurant_name: s.restaurant_name,
      contact_email: s.contact_email,
      contact_phone: s.contact_phone,
      address: s.address,
      maps_url: s.maps_url,
      opening_hours: s.opening_hours,
      duration_short_min: s.duration_short_min,
      duration_long_min: s.duration_long_min,
      party_size_threshold: s.party_size_threshold,
      max_party_size_online: s.max_party_size_online,
      cancellation_deadline_hours: s.cancellation_deadline_hours,
    });
  } catch (err) {
    console.error('info error', err);
    res.status(500).json({ error: 'Daten konnten nicht geladen werden' });
  }
});

export default router;
