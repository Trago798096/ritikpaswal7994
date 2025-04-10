import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

// Define the type for the environment variables
interface ImportMetaEnv {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_SERVICE_ROLE_KEY: string;
}

// Initialize Supabase client with service role key
const supabase = createClient(
  (import.meta.env as ImportMetaEnv).VITE_SUPABASE_URL,
  (import.meta.env as ImportMetaEnv).VITE_SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { method, query, body } = req;
    const { table, action } = query;

    if (!table || typeof table !== 'string') {
      return res.status(400).json({ error: 'Table name is required' });
    }

    let result;

    switch (method) {
      case 'GET':
        if (action === 'list') {
          // List all records
          result = await supabase
            .from(table)
            .select('*');
        } else if (action === 'get') {
          // Get single record by ID
          const { id } = query;
          if (!id || typeof id !== 'string') {
            return res.status(400).json({ error: 'ID is required for get action' });
          }
          result = await supabase
            .from(table)
            .select('*')
            .eq('id', id)
            .single();
        } else {
          return res.status(400).json({ error: 'Invalid action for GET request' });
        }
        break;

      case 'POST':
        if (!body) {
          return res.status(400).json({ error: 'Request body is required' });
        }

        if (action === 'create') {
          // Create new record
          result = await supabase
            .from(table)
            .insert(body)
            .select();
        } else if (action === 'update') {
          // Update existing record
          const { id } = body;
          if (!id) {
            return res.status(400).json({ error: 'ID is required for update action' });
          }
          result = await supabase
            .from(table)
            .update(body)
            .eq('id', id)
            .select();
        } else {
          return res.status(400).json({ error: 'Invalid action for POST request' });
        }
        break;

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (result.error) {
      throw result.error;
    }

    return res.status(200).json(result.data);
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
} 