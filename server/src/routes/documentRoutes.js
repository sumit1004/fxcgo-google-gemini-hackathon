import { Router } from 'express';
import { 
  listDocuments, 
  getChecklist, 
  uploadDocument, 
  downloadDocument, 
  deleteDocument 
} from '../controllers/documentController.js';
import { authenticate } from '../middleware/auth.js';
import { uploadMiddleware } from '../middleware/upload.js';

const router = Router();

router.use(authenticate);

router.get('/', listDocuments);
router.get('/checklist/:tradeId', getChecklist);
router.post('/upload', uploadMiddleware.single('file'), uploadDocument);
router.get('/:id/download', downloadDocument);
router.delete('/:id', deleteDocument);

export default router;
