import { Router } from 'express';
import { listReports, saveReport, deleteReport } from '../controllers/reportController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', listReports);
router.post('/', saveReport);
router.delete('/:id', deleteReport);

export default router;
