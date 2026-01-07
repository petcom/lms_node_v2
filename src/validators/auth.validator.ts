import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@/utils/ApiError';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const validateRegisterStaff = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().min(8).pattern(passwordRegex).required().messages({
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),
    firstName: Joi.string().required().messages({
      'any.required': 'First name is required'
    }),
    lastName: Joi.string().required().messages({
      'any.required': 'Last name is required'
    }),
    roles: Joi.array()
      .items(
        Joi.string().valid('instructor', 'content-admin', 'department-admin', 'billing-admin', 'system-admin')
      )
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one role is required',
        'any.required': 'Roles are required'
      }),
    phoneNumber: Joi.string().optional(),
    title: Joi.string().optional()
  });

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    throw ApiError.badRequest('Validation failed', errors as any);
  }

  next();
};

export const validateRegisterLearner = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).pattern(passwordRegex).required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    dateOfBirth: Joi.date().optional(),
    phoneNumber: Joi.string().optional()
  });

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    throw ApiError.badRequest('Validation failed', errors as any);
  }

  next();
};

export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  });

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    throw ApiError.badRequest('Validation failed', errors as any);
  }

  next();
};

export const validateRefresh = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    refreshToken: Joi.string().required()
  });

  const { error } = schema.validate(req.body);

  if (error) {
    throw ApiError.badRequest('Refresh token is required');
  }

  next();
};

export const validatePasswordChange = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).pattern(passwordRegex).required()
  });

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    throw ApiError.badRequest('Validation failed', errors as any);
  }

  next();
};

export const validateForgotPassword = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    email: Joi.string().email().required()
  });

  const { error } = schema.validate(req.body);

  if (error) {
    throw ApiError.badRequest('Valid email is required');
  }

  next();
};
