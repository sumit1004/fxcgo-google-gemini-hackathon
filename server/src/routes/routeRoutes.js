import { Router } from 'express';
import { getRouteForTrade } from '../controllers/routeController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/trade/:tradeId', getRouteForTrade);

export default router;
