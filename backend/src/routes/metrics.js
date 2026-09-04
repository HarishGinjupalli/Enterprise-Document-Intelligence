import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getMetricsSummary } from '../controllers/metricsController.js';

const router = Router();

router.use(authenticate);
router.get('/summary', getMetricsSummary);

export default router;
