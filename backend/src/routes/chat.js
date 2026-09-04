import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  chat,
  getConversations,
  getConversationMessages,
  submitFeedback,
} from '../controllers/chatController.js';

const router = Router();

router.use(authenticate);

router.post('/', chat);
router.get('/conversations', getConversations);
router.get('/conversations/:id', getConversationMessages);
router.post('/feedback', submitFeedback);

export default router;
