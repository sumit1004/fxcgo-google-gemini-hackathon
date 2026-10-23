import { Router } from 'express';
import { getWorkflow, triggerWorkflow, retryAgentStep } from '../controllers/workflowController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/:id', getWorkflow);
router.post('/:id/trigger', triggerWorkflow);
router.post('/run/:id', triggerWorkflow);
router.post('/:id/run', triggerWorkflow);
router.post('/retry/:id', retryAgentStep);
router.post('/:id/retry', retryAgentStep);

export default router;
