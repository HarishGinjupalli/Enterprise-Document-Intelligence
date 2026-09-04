import { body, validationResult } from 'express-validator';
import { AppError } from '../middleware/errorHandler.js';
import {
  findUserByEmail,
  createUser,
  verifyPassword,
  findUserById,
  updateLastLogin,
} from '../services/userService.js';
import { signToken, authenticate } from '../middleware/auth.js';

export const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').trim().notEmpty().withMessage('First name required'),
  body('lastName').trim().notEmpty().withMessage('Last name required'),
];

export const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

function handleValidation(req, _res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const err = new AppError('Validation failed', 400, 'VALIDATION_ERROR');
    err.errors = errors.array();
    return next(err);
  }
  next();
}

export async function register(req, res, next) {
  try {
    const { email, password, firstName, lastName, department } = req.body;
    const existing = await findUserByEmail(email);
    if (existing) {
      throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
    }
    const user = await createUser({ email, password, firstName, lastName, department });
    const token = signToken(user);
    res.status(201).json({ success: true, data: { user, token } });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await findUserByEmail(email);
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }
    await updateLastLogin(user.id);
    const safeUser = await findUserById(user.id);
    const token = signToken(safeUser);
    res.json({ success: true, data: { user: safeUser, token } });
  } catch (err) {
    next(err);
  }
}

export async function getCurrentUser(req, res, next) {
  try {
    const user = await findUserById(req.user.id);
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

export async function logout(_req, res) {
  res.json({ success: true, message: 'Logged out successfully' });
}

export { authenticate, handleValidation };
