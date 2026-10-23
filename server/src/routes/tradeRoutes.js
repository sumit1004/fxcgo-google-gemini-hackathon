import { Router } from 'express';
import { 
  createTrade, 
  listTrades, 
  getTradeById, 
  updateTradeDraft, 
  deleteTrade 
} from '../controllers/tradeController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createTradeSchema } from '../validations/tradeValidation.js';

const router = Router();

router.use(authenticate);

router.post('/', validate(createTradeSchema), createTrade);
router.get('/', listTrades);
router.get('/:id', getTradeById);
router.put('/:id/draft', updateTradeDraft);
router.delete('/:id', deleteTrade);

export default router;
