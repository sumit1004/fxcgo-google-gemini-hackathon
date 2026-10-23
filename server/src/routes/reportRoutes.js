import { Router } from 'express';
import { listReports, saveReport, generateReport, deleteReport } from '../controllers/reportController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', listReports);
router.post('/generate', generateReport);
router.post('/', saveReport);
router.delete('/:id', deleteReport);

export default router;
