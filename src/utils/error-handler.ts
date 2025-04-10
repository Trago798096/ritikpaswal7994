import { PostgrestError } from '@supabase/supabase-js';
import { toast } from 'sonner';

export interface ApiError {
  message: string;
  code?: string;
  details?: string;
}

export function handleError(error: Error | PostgrestError | ApiError | unknown, fallbackMessage = 'An error occurred') {
  console.error('Error:', error);

  let message = fallbackMessage;
  let description: string | undefined;

  if (error instanceof Error) {
    message = error.message;
  } else if ((error as PostgrestError).code) {
    const pgError = error as PostgrestError;
    message = pgError.message;
    description = pgError.details;
  } else if ((error as ApiError).message) {
    const apiError = error as ApiError;
    message = apiError.message;
    description = apiError.details;
  }

  toast.error(message, {
    description: description,
    duration: 5000
  });

  return { message, description };
}

export function handleSuccess(message: string, description?: string) {
  toast.success(message, {
    description,
    duration: 3000
  });
}

export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function isAuthError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.toLowerCase().includes('auth') || 
           error.message.toLowerCase().includes('permission') ||
           error.message.toLowerCase().includes('unauthorized');
  }
  return false;
}

export function isDatabaseError(error: unknown): boolean {
  return error instanceof PostgrestError || 
         (error as PostgrestError)?.code?.startsWith('PGRST') || 
         false;
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.toLowerCase().includes('network') || 
           error.message.toLowerCase().includes('fetch') ||
           error.message.toLowerCase().includes('connection');
  }
  return false;
}
