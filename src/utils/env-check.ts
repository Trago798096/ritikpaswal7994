import { toast } from 'sonner';

const REQUIRED_ENV_VARS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
] as const;

export function checkRequiredEnvVars(): boolean {
  const missingVars = REQUIRED_ENV_VARS.filter(
    varName => !(import.meta.env as any)[varName]
  );

  if (missingVars.length > 0) {
    console.error('Missing required environment variables:', missingVars);
    toast.error(
      `Missing environment variables: ${missingVars.join(', ')}. Please check your .env file.`
    );
    return false;
  }

  return true;
}

export function getEnvVar(name: typeof REQUIRED_ENV_VARS[number]): string {
  const value = (import.meta.env as any)[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
