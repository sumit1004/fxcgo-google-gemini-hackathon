import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    fullName: z.string().min(2, 'Full Name must be at least 2 characters'),
    accountType: z.enum(['EXPORTER', 'IMPORTER']),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Confirm Password must be at least 8 characters'),
    businessIdentifier: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    termsAccepted: z.boolean().refine((val) => val === true, 'You must accept the terms and conditions'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});
