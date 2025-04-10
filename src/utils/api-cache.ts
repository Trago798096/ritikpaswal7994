import { QueryClient } from '@tanstack/react-query';

// Create a client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes
      cacheTime: 1000 * 60 * 30, // Cache is kept for 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

// Cache keys for different entities
export const CACHE_KEYS = {
  EVENTS: 'events',
  MOVIES: 'movies',
  BOOKINGS: 'bookings',
  PROFILE: 'profile',
  HERO_SLIDES: 'hero-slides',
  BRAND_SETTINGS: 'brand-settings',
  PAYMENT_SETTINGS: 'payment-settings',
} as const;

// Helper to generate cache keys with params
export function createCacheKey(base: string, params?: Record<string, any>): string[] {
  const key = [base];
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        key.push(`${k}:${v}`);
      }
    });
  }
  return key;
}

// Invalidate related cache keys when data changes
export async function invalidateRelatedCaches(keys: string[]): Promise<void> {
  await Promise.all(
    keys.map(key => queryClient.invalidateQueries({ queryKey: [key] }))
  );
}

// Prefetch data that will likely be needed soon
export async function prefetchRelatedData(keys: string[]): Promise<void> {
  await Promise.all(
    keys.map(key => queryClient.prefetchQuery({ queryKey: [key], queryFn: () => fetchData(key) }))
  );
}

// Example fetch function (replace with your actual data fetching logic)
async function fetchData(key: string): Promise<any> {
  // Implement your data fetching logic here
  return null;
}

// Update cache data optimistically
export function optimisticUpdate<T>(
  key: string,
  newData: T,
  oldData?: T
): { previousData: T | undefined; rollback: () => void } {
  const previousData = oldData ?? queryClient.getQueryData([key]);

  // Update cache immediately
  queryClient.setQueryData([key], newData);

  // Return function to rollback changes if needed
  return {
    previousData,
    rollback: () => {
      queryClient.setQueryData([key], previousData);
    },
  };
}
