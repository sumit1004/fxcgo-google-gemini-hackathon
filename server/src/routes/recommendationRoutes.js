import { Router } from 'express';
import { getFinalRecommendation } from '../controllers/recommendationController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/trade/:tradeId', getFinalRecommendation);

export default router;
