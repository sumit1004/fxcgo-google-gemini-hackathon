import { Router } from 'express';
import { listForecasts, getForecastByTradeId, requestForecast } from '../controllers/currencyController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', listForecasts);
router.get('/trade/:tradeId', getForecastByTradeId);
router.post('/trade/:tradeId/forecast', requestForecast);

export default router;
