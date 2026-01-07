import { Router } from 'express';
import { AuthController } from '@/controllers/auth/auth.controller';
import { PasswordController } from '@/controllers/auth/password.controller';
import { authenticate } from '@/middlewares/authenticate';
import {
  validateRegisterStaff,
  validateRegisterLearner,
  validateLogin,
  validateRefresh,
  validatePasswordChange,
  validateForgotPassword
} from '@/validators/auth.validator';

const router = Router();

// Registration
router.post('/register/staff', validateRegisterStaff, AuthController.registerStaff);
router.post('/register/learner', validateRegisterLearner, AuthController.registerLearner);

// Authentication
router.post('/login', validateLogin, AuthController.login);
router.post('/refresh', validateRefresh, AuthController.refresh);
router.post('/logout', authenticate, AuthController.logout);

// Current user
router.get('/me', authenticate, AuthController.getCurrentUser);

// Password management
router.post('/password/forgot', validateForgotPassword, PasswordController.forgotPassword);
router.put('/password/reset/:token', PasswordController.resetPassword);
router.put('/password/change', authenticate, validatePasswordChange, PasswordController.changePassword);

export default router;
