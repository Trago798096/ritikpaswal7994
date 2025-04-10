import '../src/index.css';
import type { AppProps } from 'next/app';
import { createClient } from '@supabase/supabase-js';

// Define the type for the environment variables
interface ImportMetaEnv {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
}

// Initialize Supabase client
const supabase = createClient(
  (import.meta.env as ImportMetaEnv).VITE_SUPABASE_URL,
  (import.meta.env as ImportMetaEnv).VITE_SUPABASE_ANON_KEY
);

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Component {...pageProps} />
    </div>
  );
} 