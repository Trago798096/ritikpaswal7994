import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import rateLimit from 'express-rate-limit';
import { createHash } from 'crypto';

// Initialize rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Define the type for the environment variables
interface ImportMetaEnv {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_SERVICE_ROLE_KEY: string;
  VITE_APP_URL?: string;
}

// Initialize Supabase client with service role key
const supabase = createClient(
  (import.meta.env as ImportMetaEnv).VITE_SUPABASE_URL,
  (import.meta.env as ImportMetaEnv).VITE_SUPABASE_SERVICE_ROLE_KEY
);

// Helper function to hash sensitive data
const hashData = (data: string) => {
  return createHash('sha256').update(data).digest('hex');
};

// Helper function to validate request
const validateRequest = (req: NextApiRequest) => {
  const { table, action } = req.query;
  
  if (!table || typeof table !== 'string') {
    throw new Error('Table name is required');
  }

  if (!action || typeof action !== 'string') {
    throw new Error('Action is required');
  }

  // Validate table name to prevent SQL injection
  if (!/^[a-zA-Z0-9_]+$/.test(table)) {
    throw new Error('Invalid table name');
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Apply rate limiting
    await new Promise((resolve, reject) => {
      limiter(req, res, (result: any) => {
        if (result instanceof Error) {
          reject(result);
        }
        resolve(result);
      });
    });

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', (import.meta.env as ImportMetaEnv).VITE_APP_URL || '*');
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

    // Validate request
    validateRequest(req);

    const { method, query, body } = req;
    const { table, action } = query;

    let result;

    switch (method) {
      case 'GET':
        if (action === 'list') {
          // List all records with pagination
          const { page = 1, limit = 10, sort_by, sort_order = 'asc' } = query;
          let queryBuilder = supabase
            .from(table as string)
            .select('*', { count: 'exact' });

          // Apply sorting if specified
          if (sort_by && typeof sort_by === 'string') {
            queryBuilder = queryBuilder.order(sort_by, { ascending: sort_order === 'asc' });
          }

          // Apply pagination
          const from = (Number(page) - 1) * Number(limit);
          const to = from + Number(limit) - 1;
          queryBuilder = queryBuilder.range(from, to);

          result = await queryBuilder;
        } else if (action === 'get') {
          // Get single record by ID
          const { id } = query;
          if (!id || typeof id !== 'string') {
            throw new Error('ID is required for get action');
          }
          result = await supabase
            .from(table as string)
            .select('*')
            .eq('id', id)
            .single();
        } else {
          throw new Error('Invalid action for GET request');
        }
        break;

      case 'POST':
        if (!body) {
          throw new Error('Request body is required');
        }

        if (action === 'create') {
          // Create new record with data validation
          const sanitizedBody = { ...body };
          if (sanitizedBody.email) {
            sanitizedBody.email = sanitizedBody.email.toLowerCase();
          }
          if (sanitizedBody.phone_number) {
            sanitizedBody.phone_number = hashData(sanitizedBody.phone_number);
          }
          
          result = await supabase
            .from(table as string)
            .insert(sanitizedBody)
            .select();
        } else if (action === 'update') {
          // Update existing record
          const { id, ...updateData } = body;
          if (!id) {
            throw new Error('ID is required for update action');
          }
          
          const sanitizedData = { ...updateData };
          if (sanitizedData.email) {
            sanitizedData.email = sanitizedData.email.toLowerCase();
          }
          if (sanitizedData.phone_number) {
            sanitizedData.phone_number = hashData(sanitizedData.phone_number);
          }

          result = await supabase
            .from(table as string)
            .update(sanitizedData)
            .eq('id', id)
            .select();
        } else {
          throw new Error('Invalid action for POST request');
        }
        break;

      default:
        throw new Error('Method not allowed');
    }

    if (result.error) {
      throw result.error;
    }

    return res.status(200).json(result.data);
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(error.status || 500).json({ 
      error: error.message,
      code: error.code
    });
  }
} 