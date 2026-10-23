import { Router } from 'express';
import { getFreightForTrade } from '../controllers/freightController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/trade/:tradeId', getFreightForTrade);

export default router;
