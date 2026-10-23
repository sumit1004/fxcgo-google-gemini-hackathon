import { Router } from 'express';
import { 
  listDocuments, 
  getChecklist, 
  uploadDocument, 
  downloadDocument, 
  deleteDocument,
  syncChecklist
} from '../controllers/documentController.js';
import { authenticate } from '../middleware/auth.js';
import { uploadMiddleware } from '../middleware/upload.js';

const router = Router();

router.use(authenticate);

router.get('/', listDocuments);
router.get('/checklist/:tradeId', getChecklist);
router.get('/trade/:tradeId', getChecklist);
router.post('/trade/:tradeId/sync', syncChecklist);
router.post('/checklist/:tradeId/sync', syncChecklist);
router.post('/upload', uploadMiddleware.any(), uploadDocument);
router.get('/:id/download', downloadDocument);
router.get('/download/:id', downloadDocument);
router.delete('/:id', deleteDocument);

export default router;
