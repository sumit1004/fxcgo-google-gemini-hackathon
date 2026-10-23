import { Router } from 'express';
import { listForecasts, getForecastByTradeId, requestForecast, getCurrencyExposure } from '../controllers/currencyController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', listForecasts);
router.get('/exposure', getCurrencyExposure);
router.get('/trade/:tradeId', getForecastByTradeId);
router.post('/trade/:tradeId/forecast', requestForecast);

export default router;
