import { supabase } from './client';

export interface Recommendation {
  id?: string;
  event_id: string;
  type: 'featured' | 'recommended' | 'special';
  priority?: number;
  created_at?: string;
}

/**
 * Get recommendations by type
 */
export const getRecommendations = async (type: string = 'recommended') => {
  try {
    // First check if the recommendations table exists
    const { count, error: countError } = await supabase
      .from('recommendations')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      // Table might not exist, let's create it
      await createRecommendationsTable();
    }
    
    // Now fetch recommendations with event details
    const { data, error } = await supabase
      .from('recommendations')
      .select(`
        id,
        event_id,
        type,
        priority,
        created_at,
        events:event_id (
          id,
          title,
          description,
          image_url,
          date,
          venue,
          city,
          category,
          price_range,
          status
        )
      `)
      .eq('type', type)
      .order('priority', { ascending: false });
    
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return { data: [], error };
  }
};

/**
 * Add a recommendation
 */
export const addRecommendation = async (recommendation: Recommendation) => {
  try {
    // First check if the recommendations table exists
    const { count, error: countError } = await supabase
      .from('recommendations')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      // Table might not exist, let's create it
      await createRecommendationsTable();
    }
    
    // Now add the recommendation
    const { data, error } = await supabase
      .from('recommendations')
      .insert({
        event_id: recommendation.event_id,
        type: recommendation.type,
        priority: recommendation.priority || 0
      })
      .select();
    
    if (error) throw error;
    
    return { data: data[0], error: null };
  } catch (error) {
    console.error('Error adding recommendation:', error);
    return { data: null, error };
  }
};

/**
 * Remove a recommendation
 */
export const removeRecommendation = async (id: string) => {
  try {
    const { error } = await supabase
      .from('recommendations')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error removing recommendation:', error);
    return { success: false, error };
  }
};

/**
 * Create the recommendations table if it doesn't exist
 */
const createRecommendationsTable = async () => {
  try {
    // Try to create the table using SQL
    const { error } = await supabase.rpc('create_recommendations_table');
    
    if (error) {
      console.error('Error creating recommendations table via RPC:', error);
      // The RPC might not exist, let's handle it gracefully
      console.log('Recommendations table might not exist yet. App will continue to function.');
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error in createRecommendationsTable:', error);
    return { success: false, error };
  }
};

/**
 * Check if an event is recommended
 */
export const isEventRecommended = async (eventId: string, type: string = 'recommended') => {
  try {
    const { data, error } = await supabase
      .from('recommendations')
      .select('id')
      .eq('event_id', eventId)
      .eq('type', type)
      .maybeSingle();
    
    if (error) throw error;
    
    return { isRecommended: !!data, recommendationId: data?.id, error: null };
  } catch (error) {
    console.error('Error checking if event is recommended:', error);
    return { isRecommended: false, recommendationId: null, error };
  }
};
