import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  uploadMiddleware,
  uploadDocument,
  getDocuments,
  getDocument,
  removeDocument,
  getDocumentStatus,
} from '../controllers/documentController.js';

const router = Router();

router.use(authenticate);

router.post('/upload', uploadMiddleware, uploadDocument);
router.get('/', getDocuments);
router.get('/:id/status', getDocumentStatus);
router.get('/:id', getDocument);
router.delete('/:id', removeDocument);

export default router;
