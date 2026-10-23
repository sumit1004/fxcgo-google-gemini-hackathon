import { Router } from 'express';
import { getWeatherForTrade } from '../controllers/weatherController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/trade/:tradeId', getWeatherForTrade);

export default router;
