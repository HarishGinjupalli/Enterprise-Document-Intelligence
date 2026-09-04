import { Router } from 'express';
import {
  register,
  login,
  logout,
  getCurrentUser,
  registerValidation,
  loginValidation,
  handleValidation,
  authenticate,
} from '../controllers/authController.js';

const router = Router();

router.post('/register', registerValidation, handleValidation, register);
router.post('/login', loginValidation, handleValidation, login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getCurrentUser);

export default router;
