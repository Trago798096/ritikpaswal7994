import { createClient } from '@supabase/supabase-js';
import type { EventStatus } from '@/types/events';

interface ImportMetaEnv {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
}

// Initialize the Supabase client with environment variables
const supabaseUrl = (import.meta.env as ImportMetaEnv).VITE_SUPABASE_URL;
const supabaseKey = (import.meta.env as ImportMetaEnv).VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

const supabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'showtix-auth',
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'x-application-name': 'showtix'
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Re-export EventStatus from types
export type { EventStatus };

// Database interface
const dbClient = {
  events: () => supabaseClient.from('events'),
  bookings: () => supabaseClient.from('bookings'),
  movies: () => supabaseClient.from('movies'),
  profiles: () => supabaseClient.from('profiles'),
  cities: () => supabaseClient.from('cities'),
  countries: () => supabaseClient.from('countries'),
  ticketTypes: () => supabaseClient.from('ticket_types'),
  seatCategories: () => supabaseClient.from('seat_categories'),
  seatLayouts: () => supabaseClient.from('seat_layouts'),
  heroSlides: () => supabaseClient.from('hero_slides'),
  brandSettings: () => supabaseClient.from('brand_settings'),
  paymentSettings: () => supabaseClient.from('payment_settings'),
  payments: () => supabaseClient.from('payments')
} as const;

// Function to check if a user is an admin
const isUserAdminHelper = (email?: string | null): boolean => {
  if (!email) return false;
  const adminEmails = ['ritikpaswal79984@gmail.com'];
  return adminEmails.includes(email.toLowerCase());
};

// Improved function to ensure a bucket exists before uploading
const ensureBucketExists = async (bucketId: string, bucketName: string) => {
  try {
    console.log(`Checking if bucket exists: ${bucketId}`);
    
    // Check if bucket exists
    const { data: bucket, error: getBucketError } = await supabaseClient.storage.getBucket(bucketId);
    
    if (getBucketError) {
      console.error('Error checking bucket:', getBucketError);
      // Don't throw, just return the error
      return { success: false, error: getBucketError };
    }
    
    // Check if our bucket exists in the list
    const bucketExists = bucket !== null;
    
    // If bucket doesn't exist, create it
    if (!bucketExists) {
      console.log(`Creating bucket: ${bucketId}`);
      const { error: createBucketError } = await supabaseClient.storage.createBucket(bucketId, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/svg+xml', 'image/gif', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon']
      });
      
      if (createBucketError) {
        console.error(`Error creating bucket ${bucketId}:`, createBucketError);
        if (createBucketError.message?.includes('already exists')) {
          console.log(`Bucket ${bucketId} already exists despite list not showing it`);
          return { success: true, error: null, already_exists: true };
        }
        return { success: false, error: createBucketError };
      }
      
      console.log(`Successfully created bucket: ${bucketId}`);
    } else {
      console.log(`Bucket ${bucketId} already exists`);
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error in ensureBucketExists:', error);
    return { success: false, error };
  }
};

// Improved upload file to Supabase Storage with better error handling and admin functionality
const uploadFile = async (file: File, bucketId: string, folderPath: string = '') => {
  try {
    // First ensure the bucket exists
    const bucketResult = await ensureBucketExists(bucketId, bucketId.replace('_', ' '));
    
    if (!bucketResult.success && !bucketResult.already_exists) {
      console.warn('Proceeding with upload despite bucket creation issue');
    }
    
    // Create a unique file name
    const timestamp = new Date().getTime();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${timestamp}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`;
    
    // Construct the file path
    const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;
    
    console.log(`Uploading file to ${bucketId}/${filePath}`);
    
    // Get session to check if user is admin
    const { data: { session } } = await supabaseClient.auth.getSession();
    const userEmail = session?.user?.email;
    
    if (!userEmail || !isUserAdminHelper(userEmail)) {
      console.warn('User is not an admin, upload may fail due to permissions');
    }
    
    // Upload the file
    const { data, error } = await supabaseClient.storage
      .from(bucketId)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });
      
    if (error) {
      console.error('Error uploading file:', error);
      return { error, url: null, path: null };
    }
    
    // Generate the public URL
    const { data: { publicUrl } } = supabaseClient.storage
      .from(bucketId)
      .getPublicUrl(data?.path || filePath);
    
    console.log(`File uploaded successfully, public URL: ${publicUrl}`);
    
    return {
      url: publicUrl,
      path: data?.path || filePath,
      error: null
    };
  } catch (error) {
    console.error('Upload error:', error);
    return { url: null, path: null, error };
  }
};

// Fix: Don't use .then() which breaks the query builder chain
const getBrandSettings = async (skipCache = false) => {
  try {
    console.log('Fetching brand settings, skipCache:', skipCache);
    
    // Create the query without chaining .then()
    let query = supabaseClient
      .from('brand_settings')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1);
    
    // Execute the query
    const { data, error } = await query.maybeSingle();
    
    // Optional logging for debugging
    if (skipCache) {
      console.log('Brand settings fetch response:', { data, error });
    }
      
    if (error) {
      console.error('Error fetching brand settings:', error);
      // Return default settings in case of error
      return { 
        data: {
          site_name: 'ShowTix',
          primary_color: '#ff3366',
          logo_url: '',
          favicon_url: ''
        }, 
        error: null 
      };
    }
    
    if (!data) {
      // Return default settings if no data is found
      return { 
        data: {
          site_name: 'ShowTix',
          primary_color: '#ff3366',
          logo_url: '',
          favicon_url: ''
        }, 
        error: null 
      };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching brand settings:', error);
    // Return default settings in case of exception
    return { 
      data: {
        site_name: 'ShowTix',
        primary_color: '#ff3366',
        logo_url: '',
        favicon_url: ''
      }, 
      error 
    };
  }
};

// Improved function to update brand settings with better error handling and admin check
const updateBrandSettings = async (settings: any) => {
  try {
    // Check if user is admin
    const { data: { session } } = await supabaseClient.auth.getSession();
    const userEmail = session?.user?.email;
    
    if (!userEmail || !isUserAdminHelper(userEmail)) {
      console.error('Non-admin user attempted to update brand settings');
      return { data: null, error: new Error('Permission denied: Admin access required') };
    }
    
    // Check if we already have settings
    const { data: existingData, error: checkError } = await supabaseClient
      .from('brand_settings')
      .select('id')
      .limit(1)
      .maybeSingle();
      
    if (checkError) {
      console.error('Error checking existing brand settings:', checkError);
      return { data: null, error: checkError };
    }
    
    let result;
    if (existingData?.id) {
      // Update existing settings
      result = await supabaseClient
        .from('brand_settings')
        .update(settings)
        .eq('id', existingData.id)
        .select();
    } else {
      // Insert new settings
      result = await supabaseClient
        .from('brand_settings')
        .insert(settings)
        .select();
    }
    
    if (result.error) {
      console.error('Error updating brand settings:', result.error);
      return { data: null, error: result.error };
    }
    
    console.log('Brand settings updated successfully:', result.data);
    return { data: result.data, error: null };
  } catch (error) {
    console.error('Error updating brand settings:', error);
    console.error('Error fetching hero slides:', error);
    return { data: null, error };
  }
};

// Improved getPaymentSettings function
const getPaymentSettings = async (skipCache = false) => {
  try {
    console.log('Fetching payment settings, skipCache:', skipCache);
    
    
    // Create the query
    let query = supabaseClient
      .from('payment_settings')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1);
    
    // Execute the query
    const { data, error } = await query.maybeSingle();
    
    console.log('Payment settings fetch response:', { data, error });
      
    if (error) {
      console.error('Error fetching payment settings:', error);
      // Return default settings in case of error
      return { 
        data: {
          upi_id: 'showtix@upi',
          qr_code_url: '',
          payment_instructions: 'Please make the payment using any UPI app and enter the UTR number for verification.'
        }, 
        error: null 
      };
    }
    
    if (!data) {
      console.log('No payment settings found in database, returning defaults');
      // Return default settings if no data is found
      return { 
        data: {
          upi_id: 'showtix@upi',
          qr_code_url: '',
          payment_instructions: 'Please make the payment using any UPI app and enter the UTR number for verification.'
        }, 
        error: null 
      };
    }
    
    console.log('Payment settings data loaded:', data);
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching payment settings:', error);
    // Return default settings in case of exception
    return { 
      data: {
        upi_id: 'showtix@upi',
        qr_code_url: '',
        payment_instructions: 'Please make the payment using any UPI app and enter the UTR number for verification.'
      }, 
      error: null 
    };
  }
};

// Improved function to update payment settings
const updatePaymentSettings = async (settings: any) => {
  try {
    console.log('Attempting to update payment settings:', settings);
    
    // Check if user is admin
    const { data: { session } } = await supabaseClient.auth.getSession();
    const userEmail = session?.user?.email;
    
    if (!userEmail || !isUserAdminHelper(userEmail)) {
      console.error('Non-admin user attempted to update payment settings');
      return { data: null, error: new Error('Permission denied: Admin access required') };
    }
    
    // Check if we already have settings
    const { data: settingsData, error } = await supabaseClient.from('payment_settings')
      .select('id')
      .limit(1)
      .maybeSingle();
      
    if (error) {
      console.error('Error checking existing payment settings:', error);
      return { data: null, error };
    }
    
    console.log('Existing payment settings check result:', settingsData);
    
    // Prepare data with timestamp
    const dataToUpdate = {
      upi_id: settings.upi_id,
      qr_code_url: settings.qr_code_url,
      payment_instructions: settings.payment_instructions,
      updated_at: new Date().toISOString()
    };
    
    let result;
    if (settingsData?.id) {
      // Update existing settings
      console.log('Updating existing payment settings with ID:', settingsData.id);
      result = await supabaseClient
        .from('payment_settings')
        .update(dataToUpdate)
        .eq('id', settingsData.id)
        .select();
    } else {
      // Insert new settings
      console.log('Inserting new payment settings');
      result = await supabaseClient
        .from('payment_settings')
        .insert(dataToUpdate)
        .select();
    }
    
    if (result.error) {
      console.error('Error updating payment settings:', result.error);
      return { data: null, error: result.error };
    }
    
    console.log('Payment settings updated successfully:', result.data);
    return { data: result.data[0], error: null };
  } catch (error) {
    console.error('Error updating payment settings:', error);
    return { data: null, error };
  }
};

// Fetch hero slides with improved error handling and caching control
const getHeroSlides = async (skipCache = false, activeOnly = false) => {
  try {
    console.log('Fetching hero slides, skipCache:', skipCache, 'activeOnly:', activeOnly);
    
    // Create the query without chaining .then()
    let query = supabaseClient
      .from('hero_slides')
      .select('*')
      .order('sort_order', { ascending: true });
    
    if (activeOnly) {
      query = query.eq('is_active', true);
    }
    
    // Execute the query
    const { data, error } = await query;
    
    // Optional logging for debugging
    if (skipCache) {
      console.log('Hero slides fetch response:', { data, error });
    }
      
    if (error) {
      console.error('Error fetching hero slides:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Error:', error);
    return { data: null, error };
  }
};

const getEventById = async (eventId: string) => {
  try {
    // Check if the eventId is a UUID or a slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId);
    
    let query = supabaseClient
      .from('events')
      .select(`
        id,
        title,
        description,
        date,
        venue,
        category,
        status,
        price_range,
        image_url,
        city,
        interested,
        created_at,
        updated_at,
        seat_categories (
          id,
          name,
          price,
          description,
          color,
          icon,
          available
        ),
        seat_layouts (
          id,
          category_id,
          row_number,
          seat_number,
          status
        )
      `);
    
    // Use the appropriate column for filtering based on the ID format
    let data = null;
    let error = null;
    
    if (isUuid) {
      // If it's a valid UUID, use the id column directly
      const result = await query.eq('id', eventId);
      data = result.data;
      error = result.error;
    } else {
      // For non-UUID identifiers, first try to find by slug
      try {
        const slugResult = await supabaseClient
          .from('events')
          .select('*')
          .eq('slug', eventId);
          
        if (!slugResult.error && slugResult.data && slugResult.data.length > 0) {
          data = slugResult.data;
          error = null;
        } else {
          // If no slug match, try by title
          const titleResult = await supabaseClient
            .from('events')
            .select('*')
            .ilike('title', `%${eventId}%`);
            
          data = titleResult.data;
          error = titleResult.error;
        }
      } catch (err) {
        console.error('Error searching for event by slug/title:', err);
        error = err instanceof Error ? err : new Error('Unknown error searching for event');
      }
    }
    
    // Get the first matching event (or null if none found)
    const event = data && data.length > 0 ? data[0] : null;
      
    if (error) {
      throw error;
    }
    
    if (!event) {
      // Try to get event by title if we couldn't find it by slug
      if (!isUuid) {
        const { data: titleEvents, error: titleError } = await supabaseClient
          .from('events')
          .select('*')
          .ilike('title', `%${eventId}%`)
          .limit(1);
          
        if (!titleError && titleEvents && titleEvents.length > 0) {
          return { data: titleEvents[0], error: null };
        }
      }
      
      // If we still can't find it, handle the error
      console.warn(`Event not found: ${eventId}`);
      throw new Error('Event not found');
    }

    // If the event has no seat categories, create default ones
    if (!event.seat_categories || event.seat_categories.length === 0) {
      const defaultCategories = [
        { name: 'Premium', price: 1000, description: 'Best seats in the house', color: '#FFD700', icon: 'crown' },
        { name: 'Standard', price: 500, description: 'Regular seating', color: '#4CAF50', icon: 'chair' },
        { name: 'Economy', price: 300, description: 'Budget-friendly seats', color: '#2196F3', icon: 'chair' }
      ];

      // Insert default categories
      const { data: categories, error: categoryError } = await supabaseClient
        .from('seat_categories')
        .insert(
          defaultCategories.map(category => ({
            ...category,
            event_id: event.id,
            available: true
          }))
        )
        .select();

      if (categoryError) {
        console.error('Error creating default seat categories:', categoryError);
      } else if (categories) {
        event.seat_categories = categories;
      }
    }

    // If the event has no seat layout, create a default one
    if (!event.seat_layouts || event.seat_layouts.length === 0) {
      const layouts = [];
      const rows = ['A', 'B', 'C', 'D', 'E', 'F'];

      for (const category of event.seat_categories) {
        for (let i = 0; i < rows.length; i++) {
          const rowLetter = rows[i];
          const seatCount = 12 + (i * 2); // Increasing seats per row

          for (let j = 1; j <= seatCount; j++) {
            layouts.push({
              event_id: event.id,
              category_id: category.id,
              row_number: i + 1,
              seat_number: j,
              status: 'available'
            });
          }
        }
      }

      // Insert default layouts
      const { data: insertedLayouts, error: layoutError } = await supabaseClient
        .from('seat_layouts')
        .insert(layouts)
        .select();

      if (layoutError) {
        console.error('Error creating default seat layouts:', layoutError);
      } else if (insertedLayouts) {
        event.seat_layouts = insertedLayouts;
      }
    }

    return { data: event, error: null };
  } catch (error) {
    console.error('Error fetching event:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error('An unknown error occurred') 
    };
  }
};

// Get events by city
const getEventsByCity = async (city?: string) => {
  try {
    let query = supabaseClient.from('events').select('*');
    
    if (city && city !== 'all') {
      query = query.eq('city', city);
    }
    
    const { data: events, error } = await query;
    
    if (error) throw error;
    
    return { data: events, error: null };
  } catch (error) {
    console.error('Error fetching events by city:', error);
    return { data: null, error };
  }
};

// Get seat layout by event ID
const getSeatLayoutByEventId = async (eventId: string) => {
  try {
    const { data: layout, error } = await supabaseClient.from('seat_layouts')
      .select('*')
      .eq('event_id', eventId)
      .maybeSingle();
      
    if (error) throw error;
    
    return { data: layout, error: null };
  } catch (error) {
    console.error('Error fetching seat layout:', error);
    return { data: null, error };
  }
};

// Get ticket types
const getTicketTypes = async () => {
  try {
    const { data: ticketTypes, error } = await supabaseClient.from('ticket_types')
      .select('*')
      .order('price', { ascending: false });
      
    if (error) throw error;
    
    return { data: ticketTypes, error: null };
  } catch (error) {
    console.error('Error fetching ticket types:', error);
    return { data: null, error };
  }
};

// Upsert ticket type
const upsertTicketType = async (typeData: any) => {
  try {
    let result;
    
    if (typeData.id) {
      // Update existing type
      result = await supabaseClient
        .from('ticket_types')
        .update({
          category: typeData.category,
          base_price: typeData.base_price,
          surge_price: typeData.surge_price,
          color: typeData.color
        })
        .eq('id', typeData.id)
        .select();
    } else {
      // Insert new type
      result = await supabaseClient
        .from('ticket_types')
        .insert({
          category: typeData.category,
          base_price: typeData.base_price,
          surge_price: typeData.surge_price,
          color: typeData.color
        })
        .select();
    }
    
    if (result.error) throw result.error;
    
    return { data: result.data[0], error: null };
  } catch (error) {
    console.error('Error upserting ticket type:', error);
    return { data: null, error };
  }
};

// Upsert seat layout
const upsertSeatLayout = async (eventId: string, layoutData: any) => {
  try {
    // Check if the layout already exists
    const { data: existingLayout, error: checkError } = await supabaseClient
      .from('seat_layouts')
      .select('id')
      .eq('event_id', eventId)
      .maybeSingle();
      
    if (checkError) throw checkError;
    
    let result;
    let isNew = false;
    
    if (existingLayout?.id) {
      // Update the existing layout
      result = await supabaseClient
        .from('seat_layouts')
        .update({
          layout_data: layoutData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLayout.id)
        .select();
    } else {
      // Create a new layout
      isNew = true;
      result = await supabaseClient
        .from('seat_layouts')
        .insert({
          event_id: eventId,
          layout_data: layoutData
        })
        .select();
    }
    
    if (result.error) throw result.error;
    
    return { data: result.data[0], error: null, isNew };
  } catch (error) {
    console.error('Error upserting seat layout:', error);
    return { data: null, error, isNew: false };
  }
};

// Export all functions and types
export {
  supabaseClient as supabase,
  dbClient as db,
  isUserAdminHelper as isUserAdmin,
  getEventById,
  getEventsByCity,
  getSeatLayoutByEventId,
  getTicketTypes,
  upsertTicketType,
  upsertSeatLayout,
  getBrandSettings,
  updateBrandSettings,
  getPaymentSettings,
  updatePaymentSettings,
  getHeroSlides,
  ensureBucketExists,
  uploadFile
};
