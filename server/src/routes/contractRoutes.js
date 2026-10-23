import { Router } from 'express';
import { listContracts, createContract, updateContractStatus } from '../controllers/contractController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', listContracts);
router.post('/', createContract);
router.patch('/:id/status', updateContractStatus);

export default router;
