import { Router } from 'express';
import { getDashboardOverview } from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getDashboardOverview);
router.get('/overview', getDashboardOverview);

export default router;
