import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Get environment variables from loaded .env file
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing required environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function executeSQLFile(filePath: string): Promise<void> {
  try {
    if (!existsSync(filePath)) {
      console.error(`SQL file not found: ${filePath}`);
      return;
    }

    const sql = readFileSync(filePath, 'utf8');
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
      const { data, error } = await supabase.rpc('exec_sql', { query: statement });
      
      if (error) {
        console.error(`Error executing SQL statement: ${error.message}`);
        throw error;
      }

      if (!data.success) {
        console.error(`SQL execution failed: ${data.error}`);
        throw new Error(data.error);
      }
    }

    console.log(`Successfully executed SQL file: ${filePath}`);
  } catch (error) {
    console.error(`Error processing SQL file ${filePath}:`, error);
    throw error;
  }
}

async function setupDatabase() {
  try {
    const sqlFiles = [
      'create-exec-sql-function.sql',
      'schema.sql',
      'seed.sql'
    ];

    for (const file of sqlFiles) {
      const filePath = join(__dirname, '..', file);
      await executeSQLFile(filePath);
    }

    console.log('Database setup completed successfully');
  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1);
  }
}

setupDatabase(); 