import { z } from 'zod';

// User-related schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = loginSchema.extend({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const profileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  avatarUrl: z.string().url().nullable(),
});

// Event-related schemas
export const eventSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  imageUrl: z.string().url('Invalid image URL'),
  date: z.string().datetime('Invalid date format'),
  venue: z.string().min(3, 'Venue must be at least 3 characters'),
  city: z.string().min(2, 'City must be at least 2 characters'),
  category: z.string().min(2, 'Category must be at least 2 characters'),
  priceRange: z.string(),
  status: z.enum(['draft', 'published', 'cancelled']),
});

// Movie-related schemas
export const movieSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  posterUrl: z.string().url('Invalid poster URL'),
  releaseDate: z.string().datetime('Invalid date format'),
  duration: z.string(),
  language: z.string(),
  rating: z.number().min(0).max(10),
  genre: z.array(z.string()).min(1, 'At least one genre is required'),
  status: z.enum(['upcoming', 'running', 'ended']),
});

// Booking-related schemas
export const bookingSchema = z.object({
  eventId: z.string().uuid('Invalid event ID'),
  seats: z.array(z.object({
    row: z.string(),
    number: z.number(),
    type: z.string(),
    price: z.number().positive(),
  })).min(1, 'At least one seat must be selected'),
  totalAmount: z.number().positive('Total amount must be greater than 0'),
});

// Payment-related schemas
export const paymentSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID'),
  utrNumber: z.string().min(10, 'Invalid UTR number'),
  paymentMethod: z.enum(['upi', 'card', 'netbanking']),
  amount: z.number().positive('Amount must be greater than 0'),
});

export const upiSettingsSchema = z.object({
  upiId: z.string().regex(/^[a-zA-Z0-9.-]{2,256}@[a-zA-Z][a-zA-Z]{2,64}$/, 'Invalid UPI ID'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  active: z.boolean(),
});

// Brand settings schema
export const brandSettingsSchema = z.object({
  siteName: z.string().min(2, 'Site name must be at least 2 characters'),
  logoUrl: z.string().url('Invalid logo URL').nullable(),
  themeColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
  contactEmail: z.string().email('Invalid email address'),
});

// Hero slides schema
export const heroSlideSchema = z.object({
  imageUrl: z.string().url('Invalid image URL'),
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().nullable(),
  link: z.string().url('Invalid link URL').nullable(),
  active: z.boolean(),
  orderIndex: z.number().int().min(0),
});

// Utility functions
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  return result;
}

export function getValidationErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  error.errors.forEach(err => {
    const path = err.path.join('.');
    errors[path] = err.message;
  });
  return errors;
}

// Common validation patterns
export const patterns = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^\+?[1-9]\d{9,14}$/,
  upi: /^[a-zA-Z0-9.-]{2,256}@[a-zA-Z][a-zA-Z]{2,64}$/,
  password: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/,
  hexColor: /^#[0-9A-F]{6}$/i,
};
