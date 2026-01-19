import { Router } from 'express';
import { AuthController } from '@/controllers/auth/auth.controller';
import { PasswordController } from '@/controllers/auth/password.controller';
import { isAuthenticated } from '@/middlewares/isAuthenticated';
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
router.post('/logout', isAuthenticated, AuthController.logout);

// Current user
router.get('/me', isAuthenticated, AuthController.getCurrentUser);

// Role System V2 - Session Management
router.post('/escalate', isAuthenticated, AuthController.escalate);
router.post('/deescalate', isAuthenticated, AuthController.deescalate);
router.post('/switch-department', isAuthenticated, AuthController.switchDepartment);
router.post('/continue', isAuthenticated, AuthController.continue);

// Password management
router.post('/password/forgot', validateForgotPassword, PasswordController.forgotPassword);
router.put('/password/reset/:token', PasswordController.resetPassword);
router.put('/password/change', isAuthenticated, validatePasswordChange, PasswordController.changePassword);

export default router;
